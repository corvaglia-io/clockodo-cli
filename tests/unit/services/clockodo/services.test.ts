import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type { ClockodoHttpClient } from '../../../../src/core/http/client.js'
import { ServicesService } from '../../../../src/services/clockodo/services.js'

function createStubClient(fixture: unknown): ClockodoHttpClient {
  return {
    fetch: async <T>(_path: string, options: { schema: ZodType<T> }) =>
      options.schema.parse(fixture),
  }
}

describe('ServicesService', () => {
  it('normalizes the service list fixture', async () => {
    const fixtureUrl = new URL(
      '../../../fixtures/api-responses/services/list-success.json',
      import.meta.url,
    )
    const fixtureContents = await readFile(fixtureUrl, 'utf8')
    const fixture = JSON.parse(fixtureContents) as unknown
    const service = new ServicesService(createStubClient(fixture))
    const result = await service.list()

    expect(result.data).toEqual([
      {
        active: true,
        id: 301,
        name: 'Consulting',
        note: 'Standard consulting service',
        number: 'S-301',
      },
    ])
    expect(result.paging.count_pages).toBe(1)
  })
})

