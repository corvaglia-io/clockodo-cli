import type { EntryGroupReportRow } from '../../services/clockodo/entry-groups.js'

export const BILLING_REPORT_COLUMNS = [
  'customers_id',
  'customer_name',
  'projects_id',
  'project_name',
  'services_id',
  'service_name',
  'duration_hours',
  'revenue',
  'budget_used',
  'has_non_budget_revenues_not_billed',
  'has_budget_revenues_not_billed',
] as const

export function toHumanBillingReportRows(
  rows: readonly EntryGroupReportRow[],
): ReadonlyArray<Record<string, unknown>> {
  return rows.map((row) => ({
    budget_used: row.budget_used,
    customer_name: row.customer_name ?? null,
    customers_id: row.customers_id ?? null,
    duration_hours: row.duration_hours,
    has_budget_revenues_not_billed: row.has_budget_revenues_not_billed,
    has_non_budget_revenues_not_billed: row.has_non_budget_revenues_not_billed,
    project_name: row.project_name ?? null,
    projects_id: row.projects_id ?? null,
    revenue: row.revenue,
    service_name: row.service_name ?? null,
    services_id: row.services_id ?? null,
  }))
}
