import type { QueryValue } from '../../core/http/client.js'
import { z } from 'zod'

export const PagingSchema = z.object({
  count_items: z.number(),
  count_pages: z.number(),
  current_page: z.number(),
  items_per_page: z.number(),
})

export type Paging = z.infer<typeof PagingSchema>

export interface PagedResult<T> {
  readonly data: readonly T[]
  readonly paging: Paging
}

export type QueryParams = Record<string, QueryValue>

export function addIfDefined(
  target: QueryParams,
  key: string,
  value: QueryValue,
): void {
  if (value === undefined || value === null || value === '') {
    return
  }

  target[key] = value
}

export function addFilter(
  params: QueryParams,
  filter: QueryParams,
): void {
  if (Object.keys(filter).length === 0) {
    return
  }

  params.filter = filter
}
