import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { CurrentUserApiEnvelopeSchema, MeService } from '../../../../src/services/clockodo/me.js'

describe('MeService', () => {
  it('parses the current-user response fixture', async () => {
    const fixtureUrl = new URL(
      '../../../fixtures/api-responses/me/get-current-user-success.json',
      import.meta.url,
    )
    const fixtureContents = await readFile(fixtureUrl, 'utf8')
    const fixture = JSON.parse(fixtureContents) as unknown
    const parsedFixture = CurrentUserApiEnvelopeSchema.parse(fixture)

    expect(parsedFixture.data).toMatchObject({
      email: 'jane@example.com',
      id: 42,
      name: 'Jane Example',
    })
  })

  it('returns only the safe public subset from the live API payload', async () => {
    const service = new MeService({
      fetch: async () =>
        CurrentUserApiEnvelopeSchema.parse({
          data: {
            active: true,
            email: 'jane@example.com',
            id: 42,
            language: 'de',
            name: 'Jane Example',
            role: 'owner',
            support_pin: '3873',
            teams_id: 99,
            timezone: 'Europe/Zurich',
          },
        }),
    })

    await expect(service.getCurrentUser()).resolves.toEqual({
      active: true,
      email: 'jane@example.com',
      id: 42,
      language: 'de',
      name: 'Jane Example',
      role: 'owner',
      teams_id: 99,
      timezone: 'Europe/Zurich',
    })
  })
})
