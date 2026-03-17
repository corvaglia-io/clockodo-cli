import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type {
  ClockodoHttpClient,
  RequestOptions,
} from '../../../../src/core/http/client.js'
import { ProjectsService } from '../../../../src/services/clockodo/projects.js'

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

describe('ProjectsService', () => {
  it('normalizes the project list fixture', async () => {
    const fixtureUrl = new URL(
      '../../../fixtures/api-responses/projects/list-success.json',
      import.meta.url,
    )
    const fixtureContents = await readFile(fixtureUrl, 'utf8')
    const fixture = JSON.parse(fixtureContents) as unknown
    const service = new ProjectsService(createStubClient(fixture))
    const result = await service.list()

    expect(result.data).toEqual([
      {
        active: true,
        billable_default: true,
        completed: false,
        customers_id: 101,
        deadline: '2026-03-31',
        id: 201,
        name: 'Website Relaunch',
        note: 'Main delivery project',
        number: 'P-201',
        start_date: '2026-03-01',
      },
    ])
    expect(result.paging.current_page).toBe(1)
  })

  it('marks a project billed with the expected payload', async () => {
    const fixtureUrl = new URL(
      '../../../fixtures/api-responses/projects/set-billed-success.json',
      import.meta.url,
    )
    const fixtureContents = await readFile(fixtureUrl, 'utf8')
    const fixture = JSON.parse(fixtureContents) as unknown
    const calls: Array<{
      readonly body?: unknown
      readonly method: string
      readonly params?: unknown
      readonly path: string
    }> = []
    const service = new ProjectsService(createSequenceClient([fixture], calls))
    const project = await service.setBilled(201, {
      billedMoney: 2500,
    })

    expect(calls).toEqual([
      {
        body: {
          billed: true,
          billed_money: 2500,
        },
        method: 'PUT',
        params: undefined,
        path: '/v3/projects/201/setBilled',
      },
    ])
    expect(project.billed_money).toBe(2500)
    expect(project.billed_completely).toBe(true)
  })
})
