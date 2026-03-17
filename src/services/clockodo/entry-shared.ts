import { z } from 'zod'

export const ClockodoEntryApiSchema = z
  .object({
    billable: z.number().nullable().optional(),
    customers_id: z.number(),
    duration: z.number().nullable().optional(),
    hourly_rate: z.number().nullable().optional(),
    id: z.number(),
    lumpsum: z.number().nullable().optional(),
    lumpsum_services_id: z.number().nullable().optional(),
    projects_id: z.number().nullable().optional(),
    services_id: z.number().nullable().optional(),
    text: z.string().nullable().optional(),
    time_since: z.string(),
    time_until: z.string().nullable().optional(),
    users_id: z.number().nullable().optional(),
  })
  .passthrough()

export const ClockodoEntrySchema = z.object({
  billable: z.number().nullable().optional(),
  customers_id: z.number(),
  duration: z.number().nullable().optional(),
  hourly_rate: z.number().nullable().optional(),
  id: z.number(),
  lumpsum: z.number().nullable().optional(),
  lumpsum_services_id: z.number().nullable().optional(),
  projects_id: z.number().nullable().optional(),
  services_id: z.number().nullable().optional(),
  text: z.string().nullable().optional(),
  time_since: z.string(),
  time_until: z.string().nullable().optional(),
  users_id: z.number().nullable().optional(),
})

export type ClockodoEntry = z.infer<typeof ClockodoEntrySchema>

export function normalizeClockodoEntry(
  entry: z.infer<typeof ClockodoEntryApiSchema>,
): ClockodoEntry {
  return ClockodoEntrySchema.parse({
    billable: entry.billable,
    customers_id: entry.customers_id,
    duration: entry.duration,
    hourly_rate: entry.hourly_rate,
    id: entry.id,
    lumpsum: entry.lumpsum,
    lumpsum_services_id: entry.lumpsum_services_id,
    projects_id: entry.projects_id,
    services_id: entry.services_id,
    text: entry.text,
    time_since: entry.time_since,
    time_until: entry.time_until,
    users_id: entry.users_id,
  })
}
