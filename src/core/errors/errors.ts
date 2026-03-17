export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL: 1,
  AUTH: 2,
  VALIDATION: 3,
  NOT_FOUND: 4,
  RATE_LIMIT: 5,
  API: 6,
  NETWORK: 7,
  CONFIGURATION: 8,
} as const

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES]

interface CliErrorOptions {
  readonly cause?: unknown
  readonly details?: unknown
}

export abstract class CliError extends Error {
  readonly code: string
  readonly details?: unknown
  readonly exitCode: ExitCode

  protected constructor(
    message: string,
    code: string,
    exitCode: ExitCode,
    options: CliErrorOptions = {},
  ) {
    super(message, { cause: options.cause })

    this.name = new.target.name
    this.code = code
    this.details = options.details
    this.exitCode = exitCode
  }
}

export class GeneralError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'GENERAL_ERROR', EXIT_CODES.GENERAL, options)
  }
}

export class AuthError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'AUTH_ERROR', EXIT_CODES.AUTH, options)
  }
}

export class ValidationError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'VALIDATION_ERROR', EXIT_CODES.VALIDATION, options)
  }
}

export class NotFoundError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'NOT_FOUND_ERROR', EXIT_CODES.NOT_FOUND, options)
  }
}

export class RateLimitError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'RATE_LIMIT_ERROR', EXIT_CODES.RATE_LIMIT, options)
  }
}

export class ApiError extends CliError {
  readonly statusCode?: number

  constructor(
    message: string,
    options: CliErrorOptions & { readonly statusCode?: number } = {},
  ) {
    super(message, 'API_ERROR', EXIT_CODES.API, options)
    this.statusCode = options.statusCode
  }
}

export class NetworkError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'NETWORK_ERROR', EXIT_CODES.NETWORK, options)
  }
}

export class ConfigurationError extends CliError {
  constructor(message: string, options: CliErrorOptions = {}) {
    super(message, 'CONFIGURATION_ERROR', EXIT_CODES.CONFIGURATION, options)
  }
}

export function isCliError(error: unknown): error is CliError {
  return error instanceof CliError
}

