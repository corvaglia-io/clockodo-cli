import type { Entry } from '../../services/clockodo/entries.js'

export const ENTRY_COLUMNS = [
  'id',
  'time_since',
  'time_until',
  'customers_id',
  'projects_id',
  'services_id',
  'users_id',
  'duration',
  'billable',
  'text',
] as const

export function toDeletedEntryResult(entry: Entry): Record<string, unknown> {
  return {
    customers_id: entry.customers_id,
    id: entry.id,
    projects_id: entry.projects_id ?? null,
    services_id: entry.services_id ?? null,
    success: true,
    text: entry.text ?? null,
    time_since: entry.time_since,
    time_until: entry.time_until ?? null,
    users_id: entry.users_id ?? null,
  }
}
