import { ValidationError } from '../errors/errors.js'

export interface EntryWindowOptions {
  readonly date?: string
  readonly from?: string
  readonly since?: string
  readonly to?: string
  readonly until?: string
}

export interface ResolvedEntryWindow {
  readonly timeSince: string
  readonly timeUntil: string
}

export interface PartialResolvedEntryWindow {
  readonly timeSince?: string
  readonly timeUntil?: string
}

function formatApiDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

function isDateOnly(input: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(input)
}

function parseDateTimeInput(input: string, flagName: '--since' | '--until'): string {
  const normalizedInput = input.trim().replace(' ', 'T')

  if (isDateOnly(normalizedInput)) {
    throw new ValidationError(`${flagName} must include a time component.`)
  }

  const date = new Date(normalizedInput)

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Invalid datetime value for ${flagName}: ${input}`)
  }

  return formatApiDateTime(date)
}

function parseDateInput(input: string): { day: number; month: number; year: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())

  if (!match) {
    throw new ValidationError(`Invalid date value for --date: ${input}`)
  }

  return {
    day: Number(match[3]),
    month: Number(match[2]),
    year: Number(match[1]),
  }
}

function parseTimeInput(
  input: string,
  flagName: '--from' | '--to',
): { hours: number; minutes: number; seconds: number } {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(input.trim())

  if (!match) {
    throw new ValidationError(
      `Invalid time value for ${flagName}: ${input}. Use HH:mm or HH:mm:ss.`,
    )
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] ?? '0')

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new ValidationError(`Invalid time value for ${flagName}: ${input}`)
  }

  return { hours, minutes, seconds }
}

function combineDateAndTime(
  dateInput: string,
  timeInput: string,
  flagName: '--from' | '--to',
): string {
  const { day, month, year } = parseDateInput(dateInput)
  const { hours, minutes, seconds } = parseTimeInput(timeInput, flagName)
  const date = new Date(year, month - 1, day, hours, minutes, seconds, 0)

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`Unable to combine --date and ${flagName}.`)
  }

  return formatApiDateTime(date)
}

function validateWindowOrder(
  timeSince: string | undefined,
  timeUntil: string | undefined,
): void {
  if (!timeSince || !timeUntil) {
    return
  }

  const since = new Date(timeSince)
  const until = new Date(timeUntil)

  if (until <= since) {
    throw new ValidationError('The entry end time must be after the start time.')
  }
}

function usesSplitWindow(options: EntryWindowOptions): boolean {
  return options.date !== undefined || options.from !== undefined || options.to !== undefined
}

function usesAbsoluteWindow(options: EntryWindowOptions): boolean {
  return options.since !== undefined || options.until !== undefined
}

export function resolveCreateEntryWindow(
  options: EntryWindowOptions,
): ResolvedEntryWindow {
  const splitWindow = usesSplitWindow(options)
  const absoluteWindow = usesAbsoluteWindow(options)

  if (splitWindow && absoluteWindow) {
    throw new ValidationError(
      'Use either --since/--until or --date with --from/--to, not both.',
    )
  }

  if (splitWindow) {
    if (!options.date || !options.from || !options.to) {
      throw new ValidationError(
        'Entry creation with --date requires both --from and --to.',
      )
    }

    const timeSince = combineDateAndTime(options.date, options.from, '--from')
    const timeUntil = combineDateAndTime(options.date, options.to, '--to')
    validateWindowOrder(timeSince, timeUntil)

    return {
      timeSince,
      timeUntil,
    }
  }

  if (!options.since || !options.until) {
    throw new ValidationError(
      'Entry creation requires either --since and --until, or --date with --from and --to.',
    )
  }

  const timeSince = parseDateTimeInput(options.since, '--since')
  const timeUntil = parseDateTimeInput(options.until, '--until')
  validateWindowOrder(timeSince, timeUntil)

  return {
    timeSince,
    timeUntil,
  }
}

export function resolveUpdateEntryWindow(
  options: EntryWindowOptions,
): PartialResolvedEntryWindow {
  const splitWindow = usesSplitWindow(options)
  const absoluteWindow = usesAbsoluteWindow(options)

  if (splitWindow && absoluteWindow) {
    throw new ValidationError(
      'Use either --since/--until or --date with --from/--to, not both.',
    )
  }

  if (splitWindow) {
    if (!options.date) {
      throw new ValidationError('Updating with --from/--to also requires --date.')
    }

    if (!options.from && !options.to) {
      throw new ValidationError('Pass at least one of --from or --to with --date.')
    }

    const timeSince = options.from
      ? combineDateAndTime(options.date, options.from, '--from')
      : undefined
    const timeUntil = options.to
      ? combineDateAndTime(options.date, options.to, '--to')
      : undefined
    validateWindowOrder(timeSince, timeUntil)

    return {
      timeSince,
      timeUntil,
    }
  }

  const timeSince = options.since
    ? parseDateTimeInput(options.since, '--since')
    : undefined
  const timeUntil = options.until
    ? parseDateTimeInput(options.until, '--until')
    : undefined
  validateWindowOrder(timeSince, timeUntil)

  return {
    timeSince,
    timeUntil,
  }
}
