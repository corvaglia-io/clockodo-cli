import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type {
  ClockodoHttpClient,
  RequestOptions,
} from '../../../../src/core/http/client.js'
import { ValidationError } from '../../../../src/core/errors/errors.js'
import type { GeneralError } from '../../../../src/core/errors/errors.js'
import { ClockService } from '../../../../src/services/clockodo/clock.js'

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

describe('ClockService', () => {
  it('normalizes a running clock status fixture', async () => {
    const fixture = await readFixture('clock/status-running.json')
    const service = new ClockService(createStubClient(fixture))
    const result = await service.getStatus()

    expect(result).toEqual({
      current_time: '2026-03-16T10:30:00Z',
      entry: {
        billable: 1,
        customers_id: 101,
        duration: 1800,
        hourly_rate: 150,
        id: 9001,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 201,
        services_id: 301,
        text: 'Incident follow-up',
        time_since: '2026-03-16T10:00:00Z',
        time_until: null,
        users_id: 401,
      },
      running: true,
      stopped_entry: {
        billable: 1,
        customers_id: 101,
        duration: 5400,
        hourly_rate: 150,
        id: 9000,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 201,
        services_id: 301,
        text: 'Planning workshop',
        time_since: '2026-03-16T08:00:00Z',
        time_until: '2026-03-16T09:30:00Z',
        users_id: 401,
      },
    })
  })

  it('normalizes an idle clock status fixture', async () => {
    const fixture = await readFixture('clock/status-idle.json')
    const service = new ClockService(createStubClient(fixture))
    const result = await service.getStatus()

    expect(result).toEqual({
      current_time: '2026-03-16T10:30:00Z',
      entry: null,
      running: false,
      stopped_entry: {
        billable: 0,
        customers_id: 102,
        duration: 900,
        hourly_rate: 0,
        id: 8999,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 202,
        services_id: 302,
        text: 'Email triage',
        time_since: '2026-03-16T09:40:00Z',
        time_until: '2026-03-16T09:55:00Z',
        users_id: 401,
      },
    })
  })

  it('starts a new clock entry', async () => {
    const fixture = await readFixture('clock/start-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new ClockService(createSequenceClient([fixture], calls))
    const result = await service.start({
      customersId: 103,
      projectsId: 203,
      servicesId: 303,
      text: 'Support triage',
    })

    expect(calls).toEqual([
      {
        body: {
          customers_id: 103,
          projects_id: 203,
          services_id: 303,
          text: 'Support triage',
        },
        method: 'POST',
        params: undefined,
        path: '/v2/clock',
      },
    ])
    expect(result).toEqual({
      current_time: '2026-03-16T10:30:05Z',
      entry: {
        billable: 1,
        customers_id: 103,
        duration: 0,
        hourly_rate: 150,
        id: 9002,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 203,
        services_id: 303,
        text: 'Support triage',
        time_since: '2026-03-16T10:30:05Z',
        time_until: null,
        users_id: 401,
      },
      running: true,
      stopped_entry: null,
      stopped_has_been_truncated: false,
    })
  })

  it('stops the running clock entry', async () => {
    const statusFixture = await readFixture('clock/status-running.json')
    const stopFixture = await readFixture('clock/stop-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new ClockService(
      createSequenceClient([statusFixture, stopFixture], calls),
    )
    const result = await service.stop()

    expect(calls).toEqual([
      {
        body: undefined,
        method: 'GET',
        params: {},
        path: '/v2/clock',
      },
      {
        body: undefined,
        method: 'DELETE',
        params: undefined,
        path: '/v2/clock/9001',
      },
    ])
    expect(result).toEqual({
      current_time: '2026-03-16T10:30:10Z',
      entry: null,
      running: false,
      stopped_entry: {
        billable: 1,
        customers_id: 101,
        duration: 1810,
        hourly_rate: 150,
        id: 9001,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 201,
        services_id: 301,
        text: 'Incident follow-up',
        time_since: '2026-03-16T10:00:00Z',
        time_until: '2026-03-16T10:30:10Z',
        users_id: 401,
      },
      stopped_has_been_truncated: false,
    })
  })

  it('rejects clock out when nothing is running', async () => {
    const fixture = await readFixture('clock/status-idle.json')
    const service = new ClockService(createStubClient(fixture))

    await expect(service.stop()).rejects.toBeInstanceOf(ValidationError)
  })

  it('switches from the running clock to a new one', async () => {
    const statusFixture = await readFixture('clock/status-running.json')
    const stopFixture = await readFixture('clock/stop-success.json')
    const startFixture = await readFixture('clock/start-success.json')
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new ClockService(
      createSequenceClient([statusFixture, stopFixture, startFixture], calls),
    )
    const result = await service.switch({
      customersId: 103,
      projectsId: 203,
      servicesId: 303,
      text: 'Support triage',
    })

    expect(calls).toEqual([
      {
        body: undefined,
        method: 'GET',
        params: {},
        path: '/v2/clock',
      },
      {
        body: undefined,
        method: 'DELETE',
        params: undefined,
        path: '/v2/clock/9001',
      },
      {
        body: {
          customers_id: 103,
          projects_id: 203,
          services_id: 303,
          text: 'Support triage',
        },
        method: 'POST',
        params: undefined,
        path: '/v2/clock',
      },
    ])
    expect(result).toEqual({
      current_time: '2026-03-16T10:30:05Z',
      entry: {
        billable: 1,
        customers_id: 103,
        duration: 0,
        hourly_rate: 150,
        id: 9002,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 203,
        services_id: 303,
        text: 'Support triage',
        time_since: '2026-03-16T10:30:05Z',
        time_until: null,
        users_id: 401,
      },
      running: true,
      stopped_entry: {
        billable: 1,
        customers_id: 101,
        duration: 1810,
        hourly_rate: 150,
        id: 9001,
        lumpsum: null,
        lumpsum_services_id: null,
        projects_id: 201,
        services_id: 301,
        text: 'Incident follow-up',
        time_since: '2026-03-16T10:00:00Z',
        time_until: '2026-03-16T10:30:10Z',
        users_id: 401,
      },
      stopped_has_been_truncated: false,
    })
  })

  it('surfaces a clear error if the replacement clock fails to start', async () => {
    const statusFixture = await readFixture('clock/status-running.json')
    const stopFixture = await readFixture('clock/stop-success.json')
    const service = new ClockService({
      fetch: async <T>(path: string, options: RequestOptions<T>) => {
        if (path === '/v2/clock' && (options.method ?? 'GET') === 'GET') {
          return options.schema.parse(statusFixture)
        }

        if (path === '/v2/clock/9001' && options.method === 'DELETE') {
          return options.schema.parse(stopFixture)
        }

        throw new Error('start failed')
      },
    })

    await expect(
      service.switch({
        customersId: 103,
        projectsId: 203,
        servicesId: 303,
        text: 'Support triage',
      }),
    ).rejects.toMatchObject<Partial<GeneralError>>({
      code: 'GENERAL_ERROR',
      message:
        'The running clock was stopped, but the replacement clock could not be started.',
    })
  })
})
