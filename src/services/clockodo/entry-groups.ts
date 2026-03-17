import { z } from 'zod'

import type { ClockodoHttpClient } from '../../core/http/client.js'
import { addFilter, addIfDefined, type QueryParams } from './shared.js'

const ENTRY_GROUP_GROUPING_VALUES = [
  'billable',
  'customers_id',
  'day',
  'month',
  'is_lumpsum',
  'lumpsum_services_id',
  'projects_id',
  'services_id',
  'subprojects_id',
  'texts_id',
  'users_id',
  'week',
  'year',
] as const

const BILLING_GROUP_BY_ALIASES = [
  'billable',
  'customer',
  'day',
  'is-lumpsum',
  'lumpsum-service',
  'month',
  'project',
  'service',
  'subproject',
  'text',
  'user',
  'week',
  'year',
] as const

export const BUDGET_OPTION_VALUES = [
  'rep_filter_budget_strict',
  'rep_filter_budget_strict_completed',
  'rep_filter_budget_strict_incomplete',
  'rep_filter_budget_soft',
  'rep_filter_budget_soft_completed',
  'rep_filter_budget_soft_incomplete',
  'rep_filter_budget_without',
  'rep_filter_budget_without_strict',
] as const

const NullableNumberishSchema = z.union([z.number(), z.string()]).nullable().optional()

const EntryGroupRestrictionObjectSchema = z
  .object({
    billable: z.number().nullable().optional(),
    budget_type: z.string().nullable().optional(),
    customers_id: NullableNumberishSchema,
    entriesTexts_id: NullableNumberishSchema,
    lumpsum_services_id: NullableNumberishSchema,
    projects_id: NullableNumberishSchema,
    services_id: NullableNumberishSchema,
    subprojects_id: NullableNumberishSchema,
    teams_id: NullableNumberishSchema,
    texts_id: NullableNumberishSchema,
    users_id: NullableNumberishSchema,
  })
  .passthrough()

const EntryGroupRestrictionApiSchema = z.union([
  EntryGroupRestrictionObjectSchema,
  z.array(z.unknown()).max(0),
])

type EntryGroupApi = {
  readonly budget_used: boolean
  readonly duration: number
  readonly group: string
  readonly grouped_by: EntryGroupGrouping
  readonly has_budget_revenues_billed: boolean
  readonly has_budget_revenues_not_billed: boolean
  readonly has_non_budget_revenues_billed: boolean
  readonly has_non_budget_revenues_not_billed: boolean
  readonly hourly_rate: number | null
  readonly hourly_rate_is_equal_and_has_no_lumpsums: boolean
  readonly name: string
  readonly restrictions?: z.infer<typeof EntryGroupRestrictionApiSchema> | null
  readonly revenue: number
  readonly sub_groups?: readonly EntryGroupApi[] | null
}

const EntryGroupApiSchema: z.ZodType<EntryGroupApi> = z.lazy(() =>
  z
    .object({
      budget_used: z.boolean(),
      duration: z.number(),
      group: z.string(),
      grouped_by: z.enum(ENTRY_GROUP_GROUPING_VALUES),
      has_budget_revenues_billed: z.boolean(),
      has_budget_revenues_not_billed: z.boolean(),
      has_non_budget_revenues_billed: z.boolean(),
      has_non_budget_revenues_not_billed: z.boolean(),
      hourly_rate: z.number().nullable(),
      hourly_rate_is_equal_and_has_no_lumpsums: z.boolean(),
      name: z.string(),
      restrictions: EntryGroupRestrictionApiSchema.nullable().optional(),
      revenue: z.number(),
      sub_groups: z.array(EntryGroupApiSchema).nullable().optional(),
    })
    .passthrough(),
)

const EntryGroupListEnvelopeSchema = z.object({
  groups: z.array(EntryGroupApiSchema),
})

const EntryGroupConfirmUpdateSchema = z.object({
  affected_entries: z.number(),
  confirm_key: z.string(),
})

const EntryGroupUpdateSchema = z.object({
  edited_entries: z.number(),
  success: z.boolean(),
})

const EntryGroupMutationSchema = z.union([
  EntryGroupConfirmUpdateSchema,
  EntryGroupUpdateSchema,
])

const BILLING_GROUP_BY_MAP: Record<BillingGroupByAlias, EntryGroupGrouping> = {
  billable: 'billable',
  customer: 'customers_id',
  day: 'day',
  'is-lumpsum': 'is_lumpsum',
  'lumpsum-service': 'lumpsum_services_id',
  month: 'month',
  project: 'projects_id',
  service: 'services_id',
  subproject: 'subprojects_id',
  text: 'texts_id',
  user: 'users_id',
  week: 'week',
  year: 'year',
}

export type EntryGroupGrouping = typeof ENTRY_GROUP_GROUPING_VALUES[number]
export type BillingGroupByAlias = typeof BILLING_GROUP_BY_ALIASES[number]
export type BudgetOption = typeof BUDGET_OPTION_VALUES[number]

export interface EntryGroupRestriction {
  readonly billable?: number | null
  readonly budget_type?: string | null
  readonly customers_id?: number | null
  readonly lumpsum_services_id?: number | null
  readonly projects_id?: number | null
  readonly services_id?: number | null
  readonly subprojects_id?: number | null
  readonly teams_id?: number | null
  readonly texts_id?: number | null
  readonly users_id?: number | null
}

export interface EntryGroup {
  readonly budget_used: boolean
  readonly duration: number
  readonly group: string
  readonly grouped_by: EntryGroupGrouping
  readonly has_budget_revenues_billed: boolean
  readonly has_budget_revenues_not_billed: boolean
  readonly has_non_budget_revenues_billed: boolean
  readonly has_non_budget_revenues_not_billed: boolean
  readonly hourly_rate: number | null
  readonly hourly_rate_is_equal_and_has_no_lumpsums: boolean
  readonly name: string
  readonly restrictions: EntryGroupRestriction | null
  readonly revenue: number
  readonly sub_groups: readonly EntryGroup[]
}

export interface EntryGroupFilterOptions {
  readonly billable?: 0 | 1 | 2
  readonly budgetType?: BudgetOption
  readonly customersId?: number
  readonly lumpsumServicesId?: number
  readonly projectsId?: number
  readonly servicesId?: number
  readonly subprojectsId?: number
  readonly teamsId?: number
  readonly text?: string
  readonly textsId?: number
  readonly usersId?: number
}

export interface EntryGroupReportOptions {
  readonly calcAlsoRevenuesForProjectsWithHardBudget?: boolean
  readonly filter?: EntryGroupFilterOptions
  readonly grouping: readonly EntryGroupGrouping[]
  readonly prependCustomerToProjectName?: boolean
  readonly roundToMinutes?: number
  readonly timeSince: string
  readonly timeUntil: string
}

export interface MarkEntriesBilledOptions {
  readonly confirmKey?: string
  readonly filter?: EntryGroupFilterOptions
  readonly timeSince: string
  readonly timeUntil: string
}

export interface EntryGroupUpdateResult {
  readonly edited_entries: number
  readonly kind: 'updated'
  readonly success: boolean
}

export interface EntryGroupConfirmationRequiredResult {
  readonly affected_entries: number
  readonly confirm_key: string
  readonly kind: 'confirmation_required'
}

export type MarkEntriesBilledResult =
  | EntryGroupConfirmationRequiredResult
  | EntryGroupUpdateResult

export interface EntryGroupReportRow {
  readonly billable: number | null
  readonly budget_type: string | null
  readonly budget_used: boolean
  readonly customer_name: string | null
  readonly customers_id: number | null
  readonly day: string | null
  readonly duration: number
  readonly duration_hours: number
  readonly grouped_by: EntryGroupGrouping
  readonly group_key: string
  readonly has_budget_revenues_billed: boolean
  readonly has_budget_revenues_not_billed: boolean
  readonly has_non_budget_revenues_billed: boolean
  readonly has_non_budget_revenues_not_billed: boolean
  readonly hourly_rate: number | null
  readonly hourly_rate_is_equal_and_has_no_lumpsums: boolean
  readonly is_lumpsum: boolean | null
  readonly leaf_name: string
  readonly lumpsum_service_name: string | null
  readonly lumpsum_services_id: number | null
  readonly month: string | null
  readonly path: string
  readonly project_name: string | null
  readonly projects_id: number | null
  readonly revenue: number
  readonly service_name: string | null
  readonly services_id: number | null
  readonly subproject_name: string | null
  readonly subprojects_id: number | null
  readonly text_name: string | null
  readonly texts_id: number | null
  readonly user_name: string | null
  readonly users_id: number | null
  readonly week: string | null
  readonly year: string | null
}

interface EntryGroupPathState {
  billable?: number | null
  budget_type?: string | null
  customer_name?: string | null
  customers_id?: number | null
  day?: string | null
  is_lumpsum?: boolean | null
  lumpsum_service_name?: string | null
  lumpsum_services_id?: number | null
  month?: string | null
  project_name?: string | null
  projects_id?: number | null
  service_name?: string | null
  services_id?: number | null
  subproject_name?: string | null
  subprojects_id?: number | null
  text_name?: string | null
  texts_id?: number | null
  user_name?: string | null
  users_id?: number | null
  week?: string | null
  year?: string | null
}

function normalizeRestriction(
  restriction: z.infer<typeof EntryGroupRestrictionApiSchema> | null | undefined,
): EntryGroupRestriction | null {
  if (!restriction || Array.isArray(restriction)) {
    return null
  }

  const toNullableNumberish = (
    value: string | number | null | undefined,
  ): number | null | undefined => {
    if (value === undefined || value === null) {
      return value
    }

    if (value === '') {
      return null
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return {
    billable: restriction.billable,
    budget_type: restriction.budget_type,
    customers_id: toNullableNumberish(restriction.customers_id),
    lumpsum_services_id: toNullableNumberish(restriction.lumpsum_services_id),
    projects_id: toNullableNumberish(restriction.projects_id),
    services_id: toNullableNumberish(restriction.services_id),
    subprojects_id: toNullableNumberish(restriction.subprojects_id),
    teams_id: toNullableNumberish(restriction.teams_id),
    texts_id: toNullableNumberish(
      restriction.texts_id ?? restriction.entriesTexts_id,
    ),
    users_id: toNullableNumberish(restriction.users_id),
  }
}

function normalizeEntryGroup(group: EntryGroupApi): EntryGroup {
  return {
    budget_used: group.budget_used,
    duration: group.duration,
    group: group.group,
    grouped_by: group.grouped_by,
    has_budget_revenues_billed: group.has_budget_revenues_billed,
    has_budget_revenues_not_billed: group.has_budget_revenues_not_billed,
    has_non_budget_revenues_billed: group.has_non_budget_revenues_billed,
    has_non_budget_revenues_not_billed: group.has_non_budget_revenues_not_billed,
    hourly_rate: group.hourly_rate,
    hourly_rate_is_equal_and_has_no_lumpsums: group.hourly_rate_is_equal_and_has_no_lumpsums,
    name: group.name,
    restrictions: normalizeRestriction(group.restrictions),
    revenue: group.revenue,
    sub_groups: (group.sub_groups ?? []).map(normalizeEntryGroup),
  }
}

function toNullableNumber(value: string): number | null {
  if (value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function applyRestriction(
  target: EntryGroupPathState,
  restriction: EntryGroupRestriction | null,
): void {
  if (!restriction) {
    return
  }

  if (restriction.billable !== undefined) {
    target.billable = restriction.billable
  }

  if (restriction.budget_type !== undefined) {
    target.budget_type = restriction.budget_type
  }

  if (restriction.customers_id !== undefined) {
    target.customers_id = restriction.customers_id
  }

  if (restriction.lumpsum_services_id !== undefined) {
    target.lumpsum_services_id = restriction.lumpsum_services_id
  }

  if (restriction.projects_id !== undefined) {
    target.projects_id = restriction.projects_id
  }

  if (restriction.services_id !== undefined) {
    target.services_id = restriction.services_id
  }

  if (restriction.subprojects_id !== undefined) {
    target.subprojects_id = restriction.subprojects_id
  }

  if (restriction.texts_id !== undefined) {
    target.texts_id = restriction.texts_id
  }

  if (restriction.users_id !== undefined) {
    target.users_id = restriction.users_id
  }
}

function applyGroupingValue(
  target: EntryGroupPathState,
  groupedBy: EntryGroupGrouping,
  group: string,
  name: string,
): void {
  switch (groupedBy) {
    case 'billable':
      target.billable = toNullableNumber(group)
      break
    case 'customers_id':
      target.customers_id = toNullableNumber(group)
      target.customer_name = name
      break
    case 'day':
      target.day = group
      break
    case 'is_lumpsum':
      target.is_lumpsum = group === '1' || group.toLowerCase() === 'true'
      break
    case 'lumpsum_services_id':
      target.lumpsum_services_id = toNullableNumber(group)
      target.lumpsum_service_name = name
      break
    case 'month':
      target.month = group
      break
    case 'projects_id':
      target.projects_id = toNullableNumber(group)
      target.project_name = name
      break
    case 'services_id':
      target.services_id = toNullableNumber(group)
      target.service_name = name
      break
    case 'subprojects_id':
      target.subprojects_id = toNullableNumber(group)
      target.subproject_name = name
      break
    case 'texts_id':
      target.texts_id = toNullableNumber(group)
      target.text_name = name
      break
    case 'users_id':
      target.users_id = toNullableNumber(group)
      target.user_name = name
      break
    case 'week':
      target.week = group
      break
    case 'year':
      target.year = group
      break
  }
}

function flattenLeaves(
  groups: readonly EntryGroup[],
  rows: EntryGroupReportRow[],
  parentState: EntryGroupPathState,
  path: readonly string[],
): void {
  for (const group of groups) {
    const currentState: EntryGroupPathState = { ...parentState }

    applyRestriction(currentState, group.restrictions)
    applyGroupingValue(currentState, group.grouped_by, group.group, group.name)

    const currentPath = [...path, `${group.grouped_by}:${group.group}`]

    if (group.sub_groups.length > 0) {
      flattenLeaves(group.sub_groups, rows, currentState, currentPath)
      continue
    }

    rows.push({
      billable: currentState.billable ?? null,
      budget_type: currentState.budget_type ?? null,
      budget_used: group.budget_used,
      customer_name: currentState.customer_name ?? null,
      customers_id: currentState.customers_id ?? null,
      day: currentState.day ?? null,
      duration: group.duration,
      duration_hours: Number((group.duration / 3600).toFixed(2)),
      group_key: group.group,
      grouped_by: group.grouped_by,
      has_budget_revenues_billed: group.has_budget_revenues_billed,
      has_budget_revenues_not_billed: group.has_budget_revenues_not_billed,
      has_non_budget_revenues_billed: group.has_non_budget_revenues_billed,
      has_non_budget_revenues_not_billed: group.has_non_budget_revenues_not_billed,
      hourly_rate: group.hourly_rate,
      hourly_rate_is_equal_and_has_no_lumpsums: group.hourly_rate_is_equal_and_has_no_lumpsums,
      is_lumpsum: currentState.is_lumpsum ?? null,
      leaf_name: group.name,
      lumpsum_service_name: currentState.lumpsum_service_name ?? null,
      lumpsum_services_id: currentState.lumpsum_services_id ?? null,
      month: currentState.month ?? null,
      path: currentPath.join(' > '),
      project_name: currentState.project_name ?? null,
      projects_id: currentState.projects_id ?? null,
      revenue: group.revenue,
      service_name: currentState.service_name ?? null,
      services_id: currentState.services_id ?? null,
      subproject_name: currentState.subproject_name ?? null,
      subprojects_id: currentState.subprojects_id ?? null,
      text_name: currentState.text_name ?? null,
      texts_id: currentState.texts_id ?? null,
      user_name: currentState.user_name ?? null,
      users_id: currentState.users_id ?? null,
      week: currentState.week ?? null,
      year: currentState.year ?? null,
    })
  }
}

function toEntryGroupFilterParams(
  options: EntryGroupFilterOptions | undefined,
): QueryParams {
  const filter: QueryParams = {}

  addIfDefined(filter, 'billable', options?.billable)
  addIfDefined(filter, 'budget_type', options?.budgetType)
  addIfDefined(filter, 'customers_id', options?.customersId)
  addIfDefined(filter, 'lumpsum_services_id', options?.lumpsumServicesId)
  addIfDefined(filter, 'projects_id', options?.projectsId)
  addIfDefined(filter, 'services_id', options?.servicesId)
  addIfDefined(filter, 'subprojects_id', options?.subprojectsId)
  addIfDefined(filter, 'teams_id', options?.teamsId)
  addIfDefined(filter, 'text', options?.text)
  addIfDefined(filter, 'texts_id', options?.textsId)
  addIfDefined(filter, 'users_id', options?.usersId)

  return filter
}

export function resolveEntryGroupGroupings(
  groupBy: readonly BillingGroupByAlias[],
): readonly EntryGroupGrouping[] {
  return groupBy.map((value) => BILLING_GROUP_BY_MAP[value])
}

export function flattenEntryGroupReport(
  groups: readonly EntryGroup[],
): readonly EntryGroupReportRow[] {
  const rows: EntryGroupReportRow[] = []
  flattenLeaves(groups, rows, {}, [])
  return rows
}

export class EntryGroupsService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async listReport(options: EntryGroupReportOptions): Promise<readonly EntryGroup[]> {
    const filter = toEntryGroupFilterParams(options.filter)
    const params: QueryParams = {
      'grouping[]': options.grouping,
      time_since: options.timeSince,
      time_until: options.timeUntil,
    }

    addFilter(params, filter)
    addIfDefined(
      params,
      'calc_also_revenues_for_projects_with_hard_budget',
      options.calcAlsoRevenuesForProjectsWithHardBudget,
    )
    addIfDefined(
      params,
      'prepend_customer_to_project_name',
      options.prependCustomerToProjectName,
    )
    addIfDefined(params, 'round_to_minutes', options.roundToMinutes)

    const response = await this.client.fetch('/v2/entrygroups', {
      params,
      schema: EntryGroupListEnvelopeSchema,
    })

    return response.groups.map(normalizeEntryGroup)
  }

  async markBilled(
    options: MarkEntriesBilledOptions,
  ): Promise<MarkEntriesBilledResult> {
    const filter = toEntryGroupFilterParams(options.filter)
    const body: QueryParams = {
      billable: 2,
      time_since: options.timeSince,
      time_until: options.timeUntil,
    }

    addFilter(body, filter)
    addIfDefined(body, 'confirm_key', options.confirmKey)

    const response = await this.client.fetch('/v2/entrygroups', {
      body,
      method: 'PUT',
      schema: EntryGroupMutationSchema,
    })

    if ('confirm_key' in response) {
      return {
        affected_entries: response.affected_entries,
        confirm_key: response.confirm_key,
        kind: 'confirmation_required',
      }
    }

    return {
      edited_entries: response.edited_entries,
      kind: 'updated',
      success: response.success,
    }
  }
}

export { BILLING_GROUP_BY_ALIASES }
