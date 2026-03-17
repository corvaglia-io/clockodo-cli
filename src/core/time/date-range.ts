import { ValidationError } from '../errors/errors.js'

export interface TimeRange {
  readonly timeSince: string
  readonly timeUntil: string
}

interface ResolveEntryRangeOptions {
  readonly since?: string
  readonly today?: boolean
  readonly until?: string
}

function formatApiDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function isDateOnly(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input)
}

function parseDateInput(input: string, endOfDay: boolean): string {
  const date = isDateOnly(input)
    ? new Date(`${input}T00:00:00`)
    : new Date(input)

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid date value: ${input}`)
  }

  if (isDateOnly(input)) {
    if (endOfDay) {
      date.setHours(23, 59, 59, 999)
    } else {
      date.setHours(0, 0, 0, 0)
    }
  }

  return formatApiDateTime(date)
}

export function getTodayRange(referenceDate = new Date()): TimeRange {
  const timeSince = new Date(referenceDate)
  timeSince.setHours(0, 0, 0, 0)

  const timeUntil = new Date(referenceDate)
  timeUntil.setHours(23, 59, 59, 999)

  return {
    timeSince: formatApiDateTime(timeSince),
    timeUntil: formatApiDateTime(timeUntil),
  }
}

export function resolveEntryRange(
  options: ResolveEntryRangeOptions,
  referenceDate = new Date(),
): TimeRange {
  if (options.today) {
    if (options.since || options.until) {
      throw new ValidationError('Use either --today or --since/--until, not both.')
    }

    return getTodayRange(referenceDate)
  }

  if (!options.since && !options.until) {
    throw new ValidationError(
      'Entries list requires --today or both --since and --until.',
    )
  }

  if (!options.since || !options.until) {
    throw new ValidationError('Entries list requires both --since and --until.')
  }

  return {
    timeSince: parseDateInput(options.since, false),
    timeUntil: parseDateInput(options.until, true),
  }
}
