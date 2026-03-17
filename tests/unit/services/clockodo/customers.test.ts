import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type { ClockodoHttpClient } from '../../../../src/core/http/client.js'
import { CustomersService } from '../../../../src/services/clockodo/customers.js'

function createStubClient(fixture: unknown): ClockodoHttpClient {
  return {
    fetch: async <T>(_path: string, options: { schema: ZodType<T> }) =>
      options.schema.parse(fixture),
  }
}

describe('CustomersService', () => {
  it('normalizes the customer list fixture', async () => {
    const fixtureUrl = new URL(
      '../../../fixtures/api-responses/customers/list-success.json',
      import.meta.url,
    )
    const fixtureContents = await readFile(fixtureUrl, 'utf8')
    const fixture = JSON.parse(fixtureContents) as unknown
    const service = new CustomersService(createStubClient(fixture))
    const result = await service.list()

    expect(result.data).toEqual([
      {
        active: true,
        billable_default: true,
        color: 4,
        id: 101,
        name: 'Acme GmbH',
        note: 'Priority account',
        number: 'C-101',
      },
    ])
    expect(result.paging.count_items).toBe(1)
  })
})

