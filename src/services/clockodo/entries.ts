import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import { ValidationError } from '../../core/errors/errors.js'
import {
  addFilter,
  addIfDefined,
  PagingSchema,
  type PagedResult,
  type QueryParams,
} from './shared.js'
import {
  ClockodoEntryApiSchema,
  ClockodoEntrySchema,
  normalizeClockodoEntry,
} from './entry-shared.js'

const EntryListEnvelopeSchema = z.object({
  entries: z.array(ClockodoEntryApiSchema),
  paging: PagingSchema,
})

const EntryEnvelopeSchema = z.object({
  entry: ClockodoEntryApiSchema,
})

const EntryDeleteEnvelopeSchema = z.object({
  success: z.boolean(),
})

export const EntrySchema = ClockodoEntrySchema

export type Entry = z.infer<typeof EntrySchema>

export interface EntryListOptions {
  readonly customersId?: number
  readonly itemsPerPage?: number
  readonly page?: number
  readonly projectsId?: number
  readonly servicesId?: number
  readonly text?: string
  readonly timeSince: string
  readonly timeUntil: string
  readonly usersId?: number
}

export interface CreateTimeEntryOptions {
  readonly billable: number
  readonly customersId: number
  readonly projectsId?: number
  readonly servicesId: number
  readonly text?: string
  readonly timeSince: string
  readonly timeUntil: string
  readonly usersId?: number
}

export interface UpdateEntryOptions {
  readonly billable?: number
  readonly customersId?: number
  readonly projectsId?: number
  readonly servicesId?: number
  readonly text?: string
  readonly timeSince?: string
  readonly timeUntil?: string
  readonly usersId?: number
}

export class EntriesService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async createTimeEntry(options: CreateTimeEntryOptions): Promise<Entry> {
    const response = await this.client.fetch('/v2/entries', {
      body: {
        billable: options.billable,
        customers_id: options.customersId,
        projects_id: options.projectsId,
        services_id: options.servicesId,
        text: options.text,
        time_since: options.timeSince,
        time_until: options.timeUntil,
        users_id: options.usersId,
      },
      method: 'POST',
      schema: EntryEnvelopeSchema,
    })

    return normalizeClockodoEntry(response.entry)
  }

  async delete(id: number): Promise<boolean> {
    const response = await this.client.fetch(`/v2/entries/${id}`, {
      method: 'DELETE',
      schema: EntryDeleteEnvelopeSchema,
    })

    return response.success
  }

  async get(id: number): Promise<Entry> {
    const response = await this.client.fetch(`/v2/entries/${id}`, {
      schema: EntryEnvelopeSchema,
    })

    return normalizeClockodoEntry(response.entry)
  }

  async list(options: EntryListOptions): Promise<PagedResult<Entry>> {
    const filter: QueryParams = {}
    const params: QueryParams = {}

    addIfDefined(filter, 'customers_id', options.customersId)
    addIfDefined(filter, 'projects_id', options.projectsId)
    addIfDefined(filter, 'services_id', options.servicesId)
    addIfDefined(filter, 'text', options.text)
    addIfDefined(filter, 'users_id', options.usersId)
    addFilter(params, filter)
    addIfDefined(params, 'items_per_page', options.itemsPerPage)
    addIfDefined(params, 'page', options.page)
    addIfDefined(params, 'time_since', options.timeSince)
    addIfDefined(params, 'time_until', options.timeUntil)

    const response = await this.client.fetch('/v2/entries', {
      params,
      schema: EntryListEnvelopeSchema,
    })

    return {
      data: response.entries.map(normalizeClockodoEntry),
      paging: response.paging,
    }
  }

  async update(id: number, options: UpdateEntryOptions): Promise<Entry> {
    const body: QueryParams = {}

    addIfDefined(body, 'billable', options.billable)
    addIfDefined(body, 'customers_id', options.customersId)
    addIfDefined(body, 'projects_id', options.projectsId)
    addIfDefined(body, 'services_id', options.servicesId)
    addIfDefined(body, 'text', options.text)
    addIfDefined(body, 'time_since', options.timeSince)
    addIfDefined(body, 'time_until', options.timeUntil)
    addIfDefined(body, 'users_id', options.usersId)

    if (Object.keys(body).length === 0) {
      throw new ValidationError('No entry changes were provided.')
    }

    const response = await this.client.fetch(`/v2/entries/${id}`, {
      body,
      method: 'PUT',
      schema: EntryEnvelopeSchema,
    })

    return normalizeClockodoEntry(response.entry)
  }
}
