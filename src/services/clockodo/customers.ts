import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import {
  addFilter,
  addIfDefined,
  PagingSchema,
  type PagedResult,
  type QueryParams,
} from './shared.js'

const CustomerApiSchema = z
  .object({
    active: z.boolean().optional(),
    billable_default: z.boolean().optional(),
    color: z.number().nullable().optional(),
    id: z.number(),
    name: z.string(),
    note: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
  })
  .passthrough()

export const CustomerSchema = z.object({
  active: z.boolean().optional(),
  billable_default: z.boolean().optional(),
  color: z.number().nullable().optional(),
  id: z.number(),
  name: z.string(),
  note: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
})

const CustomerListEnvelopeSchema = z.object({
  data: z.array(CustomerApiSchema),
  paging: PagingSchema,
})

const CustomerEnvelopeSchema = z.object({
  data: CustomerApiSchema,
})

export type Customer = z.infer<typeof CustomerSchema>

export interface CustomerListOptions {
  readonly active?: boolean
  readonly fulltext?: string
  readonly itemsPerPage?: number
  readonly page?: number
}

function toCustomer(customer: z.infer<typeof CustomerApiSchema>): Customer {
  return CustomerSchema.parse({
    active: customer.active,
    billable_default: customer.billable_default,
    color: customer.color,
    id: customer.id,
    name: customer.name,
    note: customer.note,
    number: customer.number,
  })
}

export class CustomersService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async get(id: number): Promise<Customer> {
    const response = await this.client.fetch(`/v3/customers/${id}`, {
      schema: CustomerEnvelopeSchema,
    })

    return toCustomer(response.data)
  }

  async list(options: CustomerListOptions = {}): Promise<PagedResult<Customer>> {
    const filter: QueryParams = {}
    const params: QueryParams = {}

    addIfDefined(filter, 'active', options.active)
    addIfDefined(filter, 'fulltext', options.fulltext)
    addFilter(params, filter)
    addIfDefined(params, 'items_per_page', options.itemsPerPage)
    addIfDefined(params, 'page', options.page)

    const response = await this.client.fetch('/v3/customers', {
      params,
      schema: CustomerListEnvelopeSchema,
    })

    return {
      data: response.data.map(toCustomer),
      paging: response.paging,
    }
  }
}
