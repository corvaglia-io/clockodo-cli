import type { BillingExportDocument } from '../../services/clockodo/billing-export.js'

export const BILLING_EXPORT_COLUMNS = [
  'clockodo_customer_id',
  'customer_name',
  'bexio_contact_id',
  'ready',
  'line_count',
  'duration_hours',
  'revenue',
  'blocking_issue_count',
  'warning_count',
] as const

export function toHumanBillingExportRows(
  documents: readonly BillingExportDocument[],
): ReadonlyArray<Record<string, unknown>> {
  return documents.map((document) => ({
    bexio_contact_id: document.bexio_contact_id,
    blocking_issue_count: document.blocking_issues.length,
    clockodo_customer_id: document.customer.clockodo_customer_id,
    customer_name: document.customer.name,
    duration_hours: document.totals.duration_hours,
    line_count: document.line_count,
    ready: document.ready,
    revenue: document.totals.revenue,
    warning_count: document.warnings.length,
  }))
}
