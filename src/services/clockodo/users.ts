import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import {
  addFilter,
  addIfDefined,
  PagingSchema,
  type PagedResult,
  type QueryParams,
} from './shared.js'

const UserApiSchema = z
  .object({
    active: z.boolean().optional(),
    email: z.string(),
    id: z.number(),
    language: z.string().optional(),
    name: z.string(),
    role: z.string().optional(),
    start_date: z.string().nullable().optional(),
    teams_id: z.number().nullable().optional(),
    timezone: z.string().optional(),
  })
  .passthrough()

export const UserSchema = z.object({
  active: z.boolean().optional(),
  email: z.string(),
  id: z.number(),
  language: z.string().optional(),
  name: z.string(),
  role: z.string().optional(),
  start_date: z.string().nullable().optional(),
  teams_id: z.number().nullable().optional(),
  timezone: z.string().optional(),
})

const UserListEnvelopeSchema = z.object({
  data: z.array(UserApiSchema),
  paging: PagingSchema,
})

const UserEnvelopeSchema = z.object({
  data: UserApiSchema,
})

export type User = z.infer<typeof UserSchema>

export interface UserListOptions {
  readonly active?: boolean
  readonly fulltext?: string
  readonly itemsPerPage?: number
  readonly page?: number
  readonly teamsId?: number
}

function toUser(user: z.infer<typeof UserApiSchema>): User {
  return UserSchema.parse({
    active: user.active,
    email: user.email,
    id: user.id,
    language: user.language,
    name: user.name,
    role: user.role,
    start_date: user.start_date,
    teams_id: user.teams_id,
    timezone: user.timezone,
  })
}

export class UsersService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async get(id: number): Promise<User> {
    const response = await this.client.fetch(`/v3/users/${id}`, {
      schema: UserEnvelopeSchema,
    })

    return toUser(response.data)
  }

  async list(options: UserListOptions = {}): Promise<PagedResult<User>> {
    const filter: QueryParams = {}
    const params: QueryParams = {}

    addIfDefined(filter, 'active', options.active)
    addIfDefined(filter, 'fulltext', options.fulltext)
    addIfDefined(filter, 'teams_id', options.teamsId)
    addFilter(params, filter)
    addIfDefined(params, 'items_per_page', options.itemsPerPage)
    addIfDefined(params, 'page', options.page)

    const response = await this.client.fetch('/v3/users', {
      params,
      schema: UserListEnvelopeSchema,
    })

    return {
      data: response.data.map(toUser),
      paging: response.paging,
    }
  }
}
