import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'

const CurrentUserApiSchema = z
  .object({
    active: z.boolean().optional(),
    email: z.string(),
    id: z.number(),
    language: z.string().optional(),
    name: z.string(),
    role: z.string().optional(),
    teams_id: z.number().nullable().optional(),
    timezone: z.string().optional(),
  })
  .passthrough()

export const CurrentUserSchema = z.object({
  active: z.boolean().optional(),
  email: z.string(),
  id: z.number(),
  language: z.string().optional(),
  name: z.string(),
  role: z.string().optional(),
  teams_id: z.number().nullable().optional(),
  timezone: z.string().optional(),
})

export const CurrentUserApiEnvelopeSchema = z.object({
  data: CurrentUserApiSchema,
})

export type CurrentUser = z.infer<typeof CurrentUserSchema>

export class MeService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async getCurrentUser(): Promise<CurrentUser> {
    const response = await this.client.fetch('/v4/users/me', {
      schema: CurrentUserApiEnvelopeSchema,
    })

    return CurrentUserSchema.parse({
      active: response.data.active,
      email: response.data.email,
      id: response.data.id,
      language: response.data.language,
      name: response.data.name,
      role: response.data.role,
      teams_id: response.data.teams_id,
      timezone: response.data.timezone,
    })
  }
}
