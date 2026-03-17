import { describe, expect, it } from 'vitest'

import { ValidationError } from '../../../../src/core/errors/errors.js'
import { getTodayRange, resolveEntryRange } from '../../../../src/core/time/date-range.js'

describe('date-range helpers', () => {
  it('creates a local today range from a reference date', () => {
    const range = getTodayRange(new Date('2026-03-16T12:34:56Z'))

    expect(range.timeSince).toBe('2026-03-15T23:00:00Z')
    expect(range.timeUntil).toBe('2026-03-16T22:59:59Z')
  })

  it('accepts explicit date boundaries', () => {
    const range = resolveEntryRange({
      since: '2026-03-16',
      until: '2026-03-16',
    })

    expect(range.timeSince).toBe('2026-03-15T23:00:00Z')
    expect(range.timeUntil).toBe('2026-03-16T22:59:59Z')
  })

  it('rejects incomplete ranges', () => {
    expect(() => resolveEntryRange({ since: '2026-03-16' })).toThrow(
      ValidationError,
    )
  })
})
