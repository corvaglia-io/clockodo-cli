import { describe, expect, it } from 'vitest'

import { ValidationError } from '../../../../src/core/errors/errors.js'
import {
  resolveCreateEntryWindow,
  resolveUpdateEntryWindow,
} from '../../../../src/core/time/entry-window.js'

describe('entry-window helpers', () => {
  it('creates a local time window from date, from, and to flags', () => {
    const window = resolveCreateEntryWindow({
      date: '2026-03-16',
      from: '09:00',
      to: '09:30',
    })

    expect(window).toEqual({
      timeSince: '2026-03-16T08:00:00Z',
      timeUntil: '2026-03-16T08:30:00Z',
    })
  })

  it('accepts explicit datetime windows', () => {
    const window = resolveCreateEntryWindow({
      since: '2026-03-16T09:00',
      until: '2026-03-16T09:30',
    })

    expect(window).toEqual({
      timeSince: '2026-03-16T08:00:00Z',
      timeUntil: '2026-03-16T08:30:00Z',
    })
  })

  it('allows partial update windows with date and from only', () => {
    const window = resolveUpdateEntryWindow({
      date: '2026-03-16',
      from: '10:15',
    })

    expect(window).toEqual({
      timeSince: '2026-03-16T09:15:00Z',
    })
  })

  it('rejects mixed window styles', () => {
    expect(() =>
      resolveCreateEntryWindow({
        date: '2026-03-16',
        from: '09:00',
        since: '2026-03-16T09:00',
        to: '09:30',
      }),
    ).toThrow(ValidationError)
  })

  it('rejects inverted windows', () => {
    expect(() =>
      resolveCreateEntryWindow({
        date: '2026-03-16',
        from: '09:30',
        to: '09:00',
      }),
    ).toThrow(ValidationError)
  })
})
