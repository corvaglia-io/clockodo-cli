import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type {
  ClockodoHttpClient,
  RequestOptions,
} from '../../../../src/core/http/client.js'
import { ValidationError } from '../../../../src/core/errors/errors.js'
import { EntriesService } from '../../../../src/services/clockodo/entries.js'

async function readFixture(path: string): Promise<unknown> {
  const fixtureUrl = new URL(
    `../../../fixtures/api-responses/${path}`,
    import.meta.url,
  )
  const fixtureContents = await readFile(fixtureUrl, 'utf8')
  return JSON.parse(fixtureContents) as unknown
}

function createStubClient(fixture: unknown): ClockodoHttpClient {
  return {
    fetch: async <T>(_path: string, options: { schema: ZodType<T> }) =>
      options.schema.parse(fixture),
  }
}

function createSequenceClient(
  responses: readonly unknown[],
  calls: Array<{
    readonly body?: unknown
    readonly method: string
    readonly params?: unknown
    readonly path: string
  }>,
): ClockodoHttpClient {
  let responseIndex = 0

  return {
    fetch: async <T>(path: string, options: RequestOptions<T>) => {
      calls.push({
        body: options.body,
        method: options.method ?? 'GET',
        params: options.params,
        path,
      })

      const response = responses[responseIndex]
      responseIndex += 1

      return options.schema.parse(response) as T
    },
  }
}

describe('EntriesService', () => {
  it('normalizes the entry list fixture', async () => {
    const fixture = await readFixture('entries/list-success.json')
    const service = new EntriesService(createStubClient(fixture))
    const result = await service.list({
      timeSince: '2026-03-15T23:00:00Z',
      timeUntil: '2026-03-16T22:59:59Z',
    })

    expect(result.data).toEqual([
      {
        billable: 1,
        customers_id: 101,
        duration: 5400,
        hourly_rate: 150,
        id: 501,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 201,
        services_id: 301,
        text: 'Planning workshop',
        time_since: '2026-03-16T08:00:00Z',
        time_until: '2026-03-16T09:30:00Z',
        users_id: 401,
      },
    ])
    expect(result.paging.count_items).toBe(1)
  })

  it('creates a time entry with the expected payload', async () => {
    const fixture = await readFixture('entries/create-time-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new EntriesService(createSequenceClient([fixture], calls))
    const entry = await service.createTimeEntry({
      billable: 0,
      customersId: 10001,
      projectsId: 20001,
      servicesId: 30001,
      text: 'Manual entry',
      timeSince: '2026-03-16T08:00:00Z',
      timeUntil: '2026-03-16T08:30:00Z',
      usersId: 40001,
    })

    expect(calls).toEqual([
      {
        body: {
          billable: 0,
          customers_id: 10001,
          projects_id: 20001,
          services_id: 30001,
          text: 'Manual entry',
          time_since: '2026-03-16T08:00:00Z',
          time_until: '2026-03-16T08:30:00Z',
          users_id: 40001,
        },
        method: 'POST',
        params: undefined,
        path: '/v2/entries',
      },
    ])
    expect(entry.id).toBe(601)
    expect(entry.projects_id).toBe(20001)
  })

  it('updates an entry with the expected patch payload', async () => {
    const fixture = await readFixture('entries/update-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new EntriesService(createSequenceClient([fixture], calls))
    const entry = await service.update(601, {
      billable: 1,
      projectsId: 20002,
      servicesId: 30002,
      text: 'Updated manual entry',
      timeSince: '2026-03-16T08:15:00Z',
      timeUntil: '2026-03-16T09:00:00Z',
    })

    expect(calls).toEqual([
      {
        body: {
          billable: 1,
          projects_id: 20002,
          services_id: 30002,
          text: 'Updated manual entry',
          time_since: '2026-03-16T08:15:00Z',
          time_until: '2026-03-16T09:00:00Z',
        },
        method: 'PUT',
        params: undefined,
        path: '/v2/entries/601',
      },
    ])
    expect(entry.text).toBe('Updated manual entry')
    expect(entry.billable).toBe(1)
  })

  it('rejects empty updates', async () => {
    const service = new EntriesService({
      fetch: async <T>(path: string, options: RequestOptions<T>) => {
        void path
        void options
        throw new Error('should not be called')
      },
    })

    await expect(service.update(601, {})).rejects.toBeInstanceOf(ValidationError)
  })

  it('deletes an entry and returns success', async () => {
    const fixture = await readFixture('entries/delete-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new EntriesService(createSequenceClient([fixture], calls))
    const success = await service.delete(601)

    expect(calls).toEqual([
      {
        body: undefined,
        method: 'DELETE',
        params: undefined,
        path: '/v2/entries/601',
      },
    ])
    expect(success).toBe(true)
  })
})
