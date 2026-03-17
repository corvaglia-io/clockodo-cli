import { describe, expect, it } from 'vitest'

import { ValidationError } from '../../../../src/core/errors/errors.js'
import { resolveBillingRange } from '../../../../src/core/time/billing-range.js'

describe('billing-range helpers', () => {
  it('creates an explicit local month range', () => {
    const range = resolveBillingRange({
      month: '2026-02',
    })

    expect(range.label).toBe('2026-02')
    expect(range.timeSince).toBe('2026-01-31T23:00:00Z')
    expect(range.timeUntil).toBe('2026-02-28T22:59:59Z')
  })

  it('creates the previous local month range from a reference date', () => {
    const range = resolveBillingRange(
      {
        lastMonth: true,
      },
      new Date('2026-03-16T12:00:00Z'),
    )

    expect(range.label).toBe('2026-02')
    expect(range.timeSince).toBe('2026-01-31T23:00:00Z')
    expect(range.timeUntil).toBe('2026-02-28T22:59:59Z')
  })

  it('rejects mixed month and explicit ranges', () => {
    expect(() =>
      resolveBillingRange({
        month: '2026-02',
        since: '2026-02-01',
        until: '2026-02-28',
      }),
    ).toThrow(ValidationError)
  })
})
