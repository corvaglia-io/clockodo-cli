import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import {
  addFilter,
  addIfDefined,
  PagingSchema,
  type PagedResult,
  type QueryParams,
} from './shared.js'

const ServiceApiSchema = z
  .object({
    active: z.boolean().optional(),
    id: z.number(),
    name: z.string(),
    note: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
  })
  .passthrough()

export const ServiceSchema = z.object({
  active: z.boolean().optional(),
  id: z.number(),
  name: z.string(),
  note: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
})

const ServiceListEnvelopeSchema = z.object({
  data: z.array(ServiceApiSchema),
  paging: PagingSchema,
})

const ServiceEnvelopeSchema = z.object({
  data: ServiceApiSchema,
})

export type Service = z.infer<typeof ServiceSchema>

export interface ServiceListOptions {
  readonly active?: boolean
  readonly fulltext?: string
  readonly itemsPerPage?: number
  readonly page?: number
}

function toService(service: z.infer<typeof ServiceApiSchema>): Service {
  return ServiceSchema.parse({
    active: service.active,
    id: service.id,
    name: service.name,
    note: service.note,
    number: service.number,
  })
}

export class ServicesService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async get(id: number): Promise<Service> {
    const response = await this.client.fetch(`/v4/services/${id}`, {
      schema: ServiceEnvelopeSchema,
    })

    return toService(response.data)
  }

  async list(options: ServiceListOptions = {}): Promise<PagedResult<Service>> {
    const filter: QueryParams = {}
    const params: QueryParams = {}

    addIfDefined(filter, 'active', options.active)
    addIfDefined(filter, 'fulltext', options.fulltext)
    addFilter(params, filter)
    addIfDefined(params, 'items_per_page', options.itemsPerPage)
    addIfDefined(params, 'page', options.page)

    const response = await this.client.fetch('/v4/services', {
      params,
      schema: ServiceListEnvelopeSchema,
    })

    return {
      data: response.data.map(toService),
      paging: response.paging,
    }
  }
}
