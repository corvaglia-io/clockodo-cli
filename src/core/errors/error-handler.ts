import process from 'node:process'

import { ZodError } from 'zod'

import {
  GeneralError,
  ValidationError,
  isCliError,
  type CliError,
  type ExitCode,
} from './errors.js'

interface JsonErrorEnvelope {
  readonly error: {
    readonly code: string
    readonly message: string
    readonly details?: unknown
  }
}

function normalizeError(error: unknown): CliError {
  if (isCliError(error)) {
    return error
  }

  if (error instanceof ZodError) {
    return new ValidationError('Received an unexpected response shape from Clockodo.', {
      cause: error,
      details: error.flatten(),
    })
  }

  if (error instanceof Error) {
    return new GeneralError(error.message, { cause: error })
  }

  return new GeneralError('An unexpected error occurred.', { details: error })
}

function createJsonErrorEnvelope(error: CliError): JsonErrorEnvelope {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  }
}

export function handleError(error: unknown, json = false): ExitCode {
  const normalizedError = normalizeError(error)

  if (json) {
    process.stderr.write(
      `${JSON.stringify(createJsonErrorEnvelope(normalizedError), null, 2)}\n`,
    )
  } else {
    process.stderr.write(`Error: ${normalizedError.message}\n`)
  }

  return normalizedError.exitCode
}

