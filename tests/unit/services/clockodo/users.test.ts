import { readFile } from 'node:fs/promises'

import type { ZodType } from 'zod'
import { describe, expect, it } from 'vitest'

import type { ClockodoHttpClient } from '../../../../src/core/http/client.js'
import { UsersService } from '../../../../src/services/clockodo/users.js'

function createStubClient(fixture: unknown): ClockodoHttpClient {
  return {
    fetch: async <T>(_path: string, options: { schema: ZodType<T> }) =>
      options.schema.parse(fixture),
  }
}

describe('UsersService', () => {
  it('normalizes the user list fixture', async () => {
    const fixtureUrl = new URL(
      '../../../fixtures/api-responses/users/list-success.json',
      import.meta.url,
    )
    const fixtureContents = await readFile(fixtureUrl, 'utf8')
    const fixture = JSON.parse(fixtureContents) as unknown
    const service = new UsersService(createStubClient(fixture))
    const result = await service.list()

    expect(result.data).toEqual([
      {
        active: true,
        email: 'jane@example.com',
        id: 401,
        language: 'de',
        name: 'Jane Example',
        role: 'worker',
        start_date: '2025-01-01',
        teams_id: 12,
        timezone: 'Europe/Zurich',
      },
    ])
    expect(result.paging.items_per_page).toBe(50)
  })
})

