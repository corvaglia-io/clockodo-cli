import { setTimeout as delay } from 'node:timers/promises'

import type { ZodType } from 'zod'

import type {
  ClockodoCredentials,
  ProfileRequestPolicy,
} from '../config/types.js'
import {
  ApiError,
  AuthError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../errors/errors.js'
import { assertRequestAllowed } from '../policy/request-policy.js'

type QueryPrimitive = boolean | number | string
export type QueryValue =
  | QueryPrimitive
  | null
  | undefined
  | readonly QueryValue[]
  | { readonly [key: string]: QueryValue }

export interface ClockodoHttpClient {
  fetch<T>(path: string, options: RequestOptions<T>): Promise<T>
}

export interface RequestOptions<T> {
  readonly body?: unknown
  readonly bodyFormat?: 'form' | 'json'
  readonly headers?: Readonly<Record<string, string>>
  readonly method?: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
  readonly params?: Readonly<Record<string, QueryValue>>
  readonly schema: ZodType<T>
}

export interface CreateClockodoClientOptions {
  readonly debug?: boolean
  readonly maxRetries?: number
  readonly requestPolicy?: ProfileRequestPolicy
  readonly requestProfile?: string
  readonly requestSource?: 'raw' | 'standard'
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function appendQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: QueryValue,
): void {
  if (value === undefined || value === null) {
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryValue(searchParams, key, item)
    }

    return
  }

  if (typeof value === 'object') {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendQueryValue(searchParams, `${key}[${nestedKey}]`, nestedValue)
    }

    return
  }

  searchParams.append(key, String(value))
}

export function buildClockodoUrl(
  baseUrl: string,
  path: string,
  params?: Readonly<Record<string, QueryValue>>,
): URL {
  const url = new URL(path.replace(/^\/+/, ''), normalizeBaseUrl(baseUrl))

  for (const [key, value] of Object.entries(params ?? {})) {
    appendQueryValue(url.searchParams, key, value)
  }

  return url
}

function createHeaders(
  credentials: ClockodoCredentials,
  bodyFormat: 'form' | 'json' | undefined,
  additionalHeaders?: Readonly<Record<string, string>>,
): Headers {
  const headers = new Headers({
    Accept: 'application/json',
    'X-Clockodo-External-Application': `${credentials.appName};${credentials.appEmail}`,
    'X-ClockodoApiKey': credentials.apiKey,
    'X-ClockodoApiUser': credentials.apiUser,
  })

  if (credentials.locale) {
    headers.set('Accept-Language', credentials.locale)
  }

  if (bodyFormat === 'json') {
    headers.set('Content-Type', 'application/json')
  }

  if (bodyFormat === 'form') {
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
  }

  for (const [key, value] of Object.entries(additionalHeaders ?? {})) {
    headers.set(key, value)
  }

  return headers
}

function createRequestBody(
  body: unknown,
  bodyFormat: 'form' | 'json' | undefined,
): BodyInit | undefined {
  if (body === undefined) {
    return undefined
  }

  if (bodyFormat === 'form') {
    const searchParams = new URLSearchParams()

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new ValidationError('Form request bodies must be plain objects.')
    }

    for (const [key, value] of Object.entries(body)) {
      appendQueryValue(searchParams, key, value as QueryValue)
    }

    return searchParams
  }

  return JSON.stringify(body)
}

function getRetryDelayMs(attempt: number): number {
  const cappedAttempt = Math.min(attempt, 5)
  const jitter = Math.floor(Math.random() * 250)
  return Math.min(1000 * 2 ** cappedAttempt + jitter, 60_000)
}

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  if ('message' in payload && typeof payload.message === 'string') {
    return payload.message
  }

  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error
  }

  if (
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object' &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message
  }

  if ('errors' in payload && Array.isArray(payload.errors)) {
    const firstError = payload.errors[0]

    if (firstError && typeof firstError === 'object' && 'message' in firstError) {
      return typeof firstError.message === 'string' ? firstError.message : undefined
    }
  }

  return undefined
}

function createHttpError(statusCode: number, payload: unknown): Error {
  const extractedMessage =
    extractErrorMessage(payload) ?? `Clockodo request failed with status ${statusCode}.`

  if (statusCode === 401 || statusCode === 403) {
    return new AuthError(extractedMessage, { details: payload })
  }

  if (statusCode === 404) {
    return new NotFoundError(extractedMessage, { details: payload })
  }

  if (statusCode === 429) {
    return new RateLimitError(extractedMessage, { details: payload })
  }

  if (statusCode === 400 || statusCode === 422) {
    return new ValidationError(extractedMessage, { details: payload })
  }

  return new ApiError(extractedMessage, { details: payload, statusCode })
}

function logDebug(message: string, enabled: boolean): void {
  if (!enabled) {
    return
  }

  process.stderr.write(`[debug] ${message}\n`)
}

export function createClockodoClient(
  credentials: ClockodoCredentials,
  options: CreateClockodoClientOptions = {},
): ClockodoHttpClient {
  const debug = options.debug ?? false
  const maxRetries = options.maxRetries ?? 5
  const requestSource = options.requestSource ?? 'standard'

  return {
    async fetch<T>(path: string, requestOptions: RequestOptions<T>): Promise<T> {
      const method = requestOptions.method ?? 'GET'

      if (options.requestPolicy) {
        assertRequestAllowed(options.requestPolicy, {
          method,
          path,
          profile: options.requestProfile ?? credentials.profile ?? 'default',
          source: requestSource,
        })
      }

      const url = buildClockodoUrl(credentials.baseUrl, path, requestOptions.params)
      const bodyFormat = requestOptions.body ? requestOptions.bodyFormat ?? 'json' : undefined
      const headers = createHeaders(credentials, bodyFormat, requestOptions.headers)
      const body = createRequestBody(requestOptions.body, bodyFormat)

      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const requestStartedAt = performance.now()

        try {
          logDebug(`${method} ${url.toString()} attempt=${attempt + 1}`, debug)

          const response = await fetch(url, {
            body,
            headers,
            method,
          })

          const durationMs = Math.round(performance.now() - requestStartedAt)
          logDebug(
            `${method} ${url.toString()} status=${response.status} duration_ms=${durationMs}`,
            debug,
          )

          if (
            RETRYABLE_STATUS_CODES.has(response.status) &&
            attempt < maxRetries
          ) {
            const retryDelayMs = getRetryDelayMs(attempt)
            process.stderr.write(
              `Warning: Clockodo request failed with ${response.status}; retrying in ${retryDelayMs}ms.\n`,
            )
            await delay(retryDelayMs)
            continue
          }

          const rawBody = await response.text()
          const parsedBody = rawBody ? (JSON.parse(rawBody) as unknown) : {}

          if (!response.ok) {
            throw createHttpError(response.status, parsedBody)
          }

          const parsedResponse = requestOptions.schema.safeParse(parsedBody)

          if (!parsedResponse.success) {
            throw new ValidationError(
              'Clockodo returned an unexpected response payload.',
              {
                details: parsedResponse.error.flatten(),
              },
            )
          }

          return parsedResponse.data
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new ValidationError('Clockodo returned invalid JSON.', {
              cause: error,
            })
          }

          if (
            error instanceof NetworkError ||
            error instanceof AuthError ||
            error instanceof NotFoundError ||
            error instanceof RateLimitError ||
            error instanceof ValidationError ||
            error instanceof ApiError
          ) {
            throw error
          }

          if (attempt >= maxRetries) {
            throw new NetworkError('Unable to reach Clockodo.', { cause: error })
          }

          const retryDelayMs = getRetryDelayMs(attempt)
          process.stderr.write(
            `Warning: Network error while contacting Clockodo; retrying in ${retryDelayMs}ms.\n`,
          )
          await delay(retryDelayMs)
        }
      }

      throw new NetworkError('Unable to reach Clockodo.')
    },
  }
}
