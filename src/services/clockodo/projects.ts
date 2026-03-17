import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import {
  addFilter,
  addIfDefined,
  PagingSchema,
  type PagedResult,
  type QueryParams,
} from './shared.js'

const ProjectApiSchema = z
  .object({
    active: z.boolean().optional(),
    billed_completely: z.boolean().nullable().optional(),
    billed_money: z.number().nullable().optional(),
    billable_default: z.boolean().optional(),
    completed: z.boolean().optional(),
    customers_id: z.number(),
    deadline: z.string().nullable().optional(),
    id: z.number(),
    name: z.string(),
    note: z.string().nullable().optional(),
    number: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
  })
  .passthrough()

export const ProjectSchema = z.object({
  active: z.boolean().optional(),
  billed_completely: z.boolean().nullable().optional(),
  billed_money: z.number().nullable().optional(),
  billable_default: z.boolean().optional(),
  completed: z.boolean().optional(),
  customers_id: z.number(),
  deadline: z.string().nullable().optional(),
  id: z.number(),
  name: z.string(),
  note: z.string().nullable().optional(),
  number: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
})

const ProjectListEnvelopeSchema = z.object({
  data: z.array(ProjectApiSchema),
  paging: PagingSchema,
})

const ProjectEnvelopeSchema = z.object({
  data: ProjectApiSchema,
})

export type Project = z.infer<typeof ProjectSchema>

export interface ProjectListOptions {
  readonly active?: boolean
  readonly completed?: boolean
  readonly customersId?: number
  readonly fulltext?: string
  readonly itemsPerPage?: number
  readonly page?: number
}

export interface SetProjectBilledOptions {
  readonly billedMoney?: number
}

function toProject(project: z.infer<typeof ProjectApiSchema>): Project {
  return ProjectSchema.parse({
    active: project.active,
    billed_completely: project.billed_completely,
    billed_money: project.billed_money,
    billable_default: project.billable_default,
    completed: project.completed,
    customers_id: project.customers_id,
    deadline: project.deadline,
    id: project.id,
    name: project.name,
    note: project.note,
    number: project.number,
    start_date: project.start_date,
  })
}

export class ProjectsService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async get(id: number): Promise<Project> {
    const response = await this.client.fetch(`/v4/projects/${id}`, {
      schema: ProjectEnvelopeSchema,
    })

    return toProject(response.data)
  }

  async list(options: ProjectListOptions = {}): Promise<PagedResult<Project>> {
    const filter: QueryParams = {}
    const params: QueryParams = {}

    addIfDefined(filter, 'active', options.active)
    addIfDefined(filter, 'completed', options.completed)
    addIfDefined(filter, 'customers_id', options.customersId)
    addIfDefined(filter, 'fulltext', options.fulltext)
    addFilter(params, filter)
    addIfDefined(params, 'items_per_page', options.itemsPerPage)
    addIfDefined(params, 'page', options.page)

    const response = await this.client.fetch('/v4/projects', {
      params,
      schema: ProjectListEnvelopeSchema,
    })

    return {
      data: response.data.map(toProject),
      paging: response.paging,
    }
  }

  async setBilled(id: number, options: SetProjectBilledOptions = {}): Promise<Project> {
    const response = await this.client.fetch(`/v3/projects/${id}/setBilled`, {
      body: {
        billed: true,
        billed_money: options.billedMoney,
      },
      method: 'PUT',
      schema: ProjectEnvelopeSchema,
    })

    return toProject(response.data)
  }
}
