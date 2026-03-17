export interface HumanClockEntry {
  readonly billable?: number | null
  readonly customers_id: number
  readonly duration?: number | null
  readonly id: number
  readonly projects_id?: number | null
  readonly services_id?: number | null
  readonly text?: string | null
  readonly time_since: string
  readonly time_until?: string | null
  readonly users_id?: number | null
}

export interface HumanClockResultInput {
  readonly additional_message?: string
  readonly current_time: string
  readonly entry: HumanClockEntry | null
  readonly running: boolean
  readonly stopped_entry: HumanClockEntry | null
  readonly stopped_has_been_truncated?: boolean
}

export const CLOCK_RESULT_COLUMNS = [
  'running',
  'current_time',
  'entry_id',
  'time_since',
  'time_until',
  'customers_id',
  'projects_id',
  'services_id',
  'users_id',
  'duration',
  'billable',
  'text',
  'stopped_entry_id',
  'stopped_time_since',
  'stopped_time_until',
  'stopped_customers_id',
  'stopped_projects_id',
  'stopped_services_id',
  'stopped_users_id',
  'stopped_duration',
  'stopped_billable',
  'stopped_text',
  'stopped_has_been_truncated',
  'additional_message',
] as const

export function toHumanClockResult(
  result: HumanClockResultInput,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    current_time: result.current_time,
    running: result.running,
  }

  if (result.entry) {
    output.entry_id = result.entry.id
    output.time_since = result.entry.time_since
    output.time_until = result.entry.time_until ?? null
    output.customers_id = result.entry.customers_id
    output.projects_id = result.entry.projects_id ?? null
    output.services_id = result.entry.services_id ?? null
    output.users_id = result.entry.users_id ?? null
    output.duration = result.entry.duration ?? null
    output.billable = result.entry.billable ?? null
    output.text = result.entry.text ?? null
  }

  if (result.stopped_entry) {
    output.stopped_entry_id = result.stopped_entry.id
    output.stopped_time_since = result.stopped_entry.time_since
    output.stopped_time_until = result.stopped_entry.time_until ?? null
    output.stopped_customers_id = result.stopped_entry.customers_id
    output.stopped_projects_id = result.stopped_entry.projects_id ?? null
    output.stopped_services_id = result.stopped_entry.services_id ?? null
    output.stopped_users_id = result.stopped_entry.users_id ?? null
    output.stopped_duration = result.stopped_entry.duration ?? null
    output.stopped_billable = result.stopped_entry.billable ?? null
    output.stopped_text = result.stopped_entry.text ?? null
  }

  if (result.stopped_has_been_truncated !== undefined) {
    output.stopped_has_been_truncated = result.stopped_has_been_truncated
  }

  if (result.additional_message) {
    output.additional_message = result.additional_message
  }

  return output
}
