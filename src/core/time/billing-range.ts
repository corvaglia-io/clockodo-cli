import { ValidationError } from '../errors/errors.js'

export interface BillingRange {
  readonly label: string
  readonly timeSince: string
  readonly timeUntil: string
}

interface ResolveBillingRangeOptions {
  readonly lastMonth?: boolean
  readonly month?: string
  readonly since?: string
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

function createMonthRange(year: number, monthIndex: number): BillingRange {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0)
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
  const label = `${String(year).padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}`

  return {
    label,
    timeSince: formatApiDateTime(start),
    timeUntil: formatApiDateTime(end),
  }
}

function resolveExplicitMonth(month: string): BillingRange {
  const match = /^(?<year>\d{4})-(?<month>\d{2})$/.exec(month)

  if (!match?.groups) {
    throw new ValidationError('Billing reports require --month in YYYY-MM format.')
  }

  const year = Number(match.groups.year)
  const monthNumber = Number(match.groups.month)

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new ValidationError('Billing reports require --month in YYYY-MM format.')
  }

  return createMonthRange(year, monthNumber - 1)
}

export function resolveBillingRange(
  options: ResolveBillingRangeOptions,
  referenceDate = new Date(),
): BillingRange {
  if (options.lastMonth) {
    if (options.month || options.since || options.until) {
      throw new ValidationError(
        'Use either --last-month, --month, or --since/--until, not a mix of them.',
      )
    }

    const lastMonth = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - 1,
      1,
      0,
      0,
      0,
      0,
    )

    return createMonthRange(lastMonth.getFullYear(), lastMonth.getMonth())
  }

  if (options.month) {
    if (options.since || options.until) {
      throw new ValidationError(
        'Use either --month or --since/--until, not both.',
      )
    }

    return resolveExplicitMonth(options.month)
  }

  if (!options.since && !options.until) {
    throw new ValidationError(
      'Billing commands require --last-month, --month, or both --since and --until.',
    )
  }

  if (!options.since || !options.until) {
    throw new ValidationError('Billing commands require both --since and --until.')
  }

  return {
    label: `${options.since}..${options.until}`,
    timeSince: parseDateInput(options.since, false),
    timeUntil: parseDateInput(options.until, true),
  }
}
