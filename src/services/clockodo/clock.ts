import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import { GeneralError, ValidationError } from '../../core/errors/errors.js'
import { addIfDefined, type QueryParams } from './shared.js'
import {
  ClockodoEntryApiSchema,
  ClockodoEntrySchema,
  normalizeClockodoEntry,
} from './entry-shared.js'

const ClockStatusApiEnvelopeSchema = z.object({
  current_time: z.string(),
  running: ClockodoEntryApiSchema.nullable(),
  stopped: ClockodoEntryApiSchema.nullable(),
})

const ClockActionApiEnvelopeSchema = z.object({
  additional_message: z.string().optional(),
  current_time: z.string(),
  running: ClockodoEntryApiSchema.nullable(),
  stopped: ClockodoEntryApiSchema.nullable(),
  stopped_has_been_truncated: z.boolean().optional(),
})

export const ClockResultSchema = z.object({
  additional_message: z.string().optional(),
  current_time: z.string(),
  entry: ClockodoEntrySchema.nullable(),
  running: z.boolean(),
  stopped_entry: ClockodoEntrySchema.nullable(),
  stopped_has_been_truncated: z.boolean().optional(),
})

export type ClockResult = z.infer<typeof ClockResultSchema>
export type ClockStatus = ClockResult

export interface ClockStatusOptions {
  readonly usersId?: number
}

export interface ClockStartOptions {
  readonly customersId: number
  readonly projectsId?: number
  readonly servicesId: number
  readonly text?: string
}

function normalizeClockResult(
  response: z.infer<typeof ClockStatusApiEnvelopeSchema>,
): ClockResult
function normalizeClockResult(
  response: z.infer<typeof ClockActionApiEnvelopeSchema>,
): ClockResult
function normalizeClockResult(
  response:
    | z.infer<typeof ClockStatusApiEnvelopeSchema>
    | z.infer<typeof ClockActionApiEnvelopeSchema>,
): ClockResult {
  return ClockResultSchema.parse({
    additional_message:
      'additional_message' in response ? response.additional_message : undefined,
    current_time: response.current_time,
    entry: response.running ? normalizeClockodoEntry(response.running) : null,
    running: response.running !== null,
    stopped_entry: response.stopped ? normalizeClockodoEntry(response.stopped) : null,
    stopped_has_been_truncated:
      'stopped_has_been_truncated' in response
        ? response.stopped_has_been_truncated
        : undefined,
  })
}

function mergeAdditionalMessages(
  firstMessage: string | undefined,
  secondMessage: string | undefined,
): string | undefined {
  if (firstMessage && secondMessage && firstMessage !== secondMessage) {
    return `${firstMessage} | ${secondMessage}`
  }

  return firstMessage ?? secondMessage
}

export class ClockService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async getStatus(options: ClockStatusOptions = {}): Promise<ClockStatus> {
    const params: QueryParams = {}
    addIfDefined(params, 'users_id', options.usersId)

    const response = await this.client.fetch('/v2/clock', {
      params,
      schema: ClockStatusApiEnvelopeSchema,
    })

    return normalizeClockResult(response)
  }

  async start(options: ClockStartOptions): Promise<ClockResult> {
    const response = await this.client.fetch('/v2/clock', {
      body: {
        customers_id: options.customersId,
        projects_id: options.projectsId,
        services_id: options.servicesId,
        text: options.text,
      },
      method: 'POST',
      schema: ClockActionApiEnvelopeSchema,
    })

    return normalizeClockResult(response)
  }

  async stop(): Promise<ClockResult> {
    const status = await this.getStatus()

    if (!status.running || !status.entry) {
      throw new ValidationError('No running clock was found. Use `clock in` to start one.')
    }

    const response = await this.client.fetch(`/v2/clock/${status.entry.id}`, {
      method: 'DELETE',
      schema: ClockActionApiEnvelopeSchema,
    })

    return normalizeClockResult(response)
  }

  async switch(options: ClockStartOptions): Promise<ClockResult> {
    const status = await this.getStatus()

    if (!status.running || !status.entry) {
      throw new ValidationError('No running clock was found. Use `clock in` to start one.')
    }

    const stopped = await this.client.fetch(`/v2/clock/${status.entry.id}`, {
      method: 'DELETE',
      schema: ClockActionApiEnvelopeSchema,
    })
    const stoppedResult = normalizeClockResult(stopped)

    try {
      const started = await this.client.fetch('/v2/clock', {
        body: {
          customers_id: options.customersId,
          projects_id: options.projectsId,
          services_id: options.servicesId,
          text: options.text,
        },
        method: 'POST',
        schema: ClockActionApiEnvelopeSchema,
      })
      const startedResult = normalizeClockResult(started)

      return ClockResultSchema.parse({
        additional_message: mergeAdditionalMessages(
          stoppedResult.additional_message,
          startedResult.additional_message,
        ),
        current_time: startedResult.current_time,
        entry: startedResult.entry,
        running: startedResult.running,
        stopped_entry: stoppedResult.stopped_entry,
        stopped_has_been_truncated:
          stoppedResult.stopped_has_been_truncated ??
          startedResult.stopped_has_been_truncated,
      })
    } catch (error) {
      throw new GeneralError(
        'The running clock was stopped, but the replacement clock could not be started.',
        {
          cause: error,
          details: {
            stopped_entry_id: stoppedResult.stopped_entry?.id ?? status.entry.id,
          },
        },
      )
    }
  }
}
