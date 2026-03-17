import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  buildClockodoUrl,
  createClockodoClient,
} from '../../../../src/core/http/client.js'
import { createDefaultProfileRequestPolicy } from '../../../../src/core/policy/request-policy.js'

describe('buildClockodoUrl', () => {
  it('keeps the /api prefix when joining versioned paths', () => {
    const url = buildClockodoUrl(
      'https://my.clockodo.com/api',
      '/v4/users/me',
    )

    expect(url.toString()).toBe('https://my.clockodo.com/api/v4/users/me')
  })

  it('serializes nested filter parameters using deep-object style keys', () => {
    const url = buildClockodoUrl('https://my.clockodo.com/api', '/v2/entries', {
      filter: {
        users_id: 12,
      },
      time_since: '2026-03-16T00:00:00Z',
      time_until: '2026-03-16T23:59:59Z',
    })

    expect(url.toString()).toBe(
      'https://my.clockodo.com/api/v2/entries?filter%5Busers_id%5D=12&time_since=2026-03-16T00%3A00%3A00Z&time_until=2026-03-16T23%3A59%3A59Z',
    )
  })
})

describe('createClockodoClient', () => {
  it('blocks write requests locally when the profile policy is read-only', async () => {
    const fetchMock = vi.fn()
    const originalFetch = globalThis.fetch
    const policy = createDefaultProfileRequestPolicy()

    globalThis.fetch = fetchMock as typeof fetch

    try {
      const client = createClockodoClient(
        {
          apiKey: 'secret-key',
          apiUser: 'jane@example.com',
          appEmail: 'dev@example.com',
          appName: 'Clockodo CLI',
          baseUrl: 'https://my.clockodo.com/api',
          profile: 'default',
        },
        {
          maxRetries: 0,
          requestPolicy: policy,
          requestProfile: 'default',
        },
      )

      await expect(
        client.fetch('/v2/entries', {
          body: {
            customers_id: 1,
          },
          method: 'POST',
          schema: z.object({}),
        }),
      ).rejects.toMatchObject({
        code: 'CONFIGURATION_ERROR',
        details: expect.objectContaining({
          local_guardrail_only: true,
          policy_mode: 'read-only',
        }),
      })
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('extracts nested Clockodo validation messages', async () => {
    const originalFetch = globalThis.fetch
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            fields: ['customers_id', 'projects_id'],
            message: 'Tracking times for customers is not allowed.',
          },
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    )

    globalThis.fetch = fetchMock as typeof fetch

    try {
      const client = createClockodoClient(
        {
          apiKey: 'secret-key',
          apiUser: 'jane@example.com',
          appEmail: 'dev@example.com',
          appName: 'Clockodo CLI',
          baseUrl: 'https://my.clockodo.com/api',
          profile: undefined,
        },
        {
          maxRetries: 0,
        },
      )

      await expect(
        client.fetch('/v2/clock', {
          body: {
            customers_id: 1,
            services_id: 2,
          },
          method: 'POST',
          schema: z.object({}),
        }),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Tracking times for customers is not allowed.',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
