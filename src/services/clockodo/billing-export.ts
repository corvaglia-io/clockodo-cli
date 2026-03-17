import { z } from 'zod'

import { ValidationError } from '../../core/errors/errors.js'
import type { BillingRange } from '../../core/time/billing-range.js'
import type {
  EntryGroupReportRow,
} from './entry-groups.js'

const BEXIO_LINE_GROUP_BY_ALIASES = [
  'billable',
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

const BexioInvoiceConfigSchema = z
  .object({
    apiReference: z.string().min(1).optional(),
    bankAccountId: z.number().int().positive().optional(),
    contactId: z.number().int().positive().optional(),
    contactSubId: z.number().int().positive().optional(),
    currencyId: z.number().int().positive().optional(),
    footer: z.string().optional(),
    header: z.string().optional(),
    isValidFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    isValidTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    languageId: z.number().int().positive().optional(),
    mwstIsNet: z.boolean().optional(),
    mwstType: z.number().int().optional(),
    paymentTypeId: z.number().int().positive().optional(),
    projectId: z.number().int().positive().optional(),
    reference: z.string().optional(),
    showPositionTaxes: z.boolean().optional(),
    templateSlug: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    userId: z.number().int().positive().optional(),
  })
  .passthrough()

const BexioPositionDefaultsSchema = z
  .object({
    accountId: z.number().int().positive().optional(),
    discountInPercent: z.union([z.number(), z.string()]).optional(),
    isOptional: z.boolean().optional(),
    taxId: z.number().int().positive().optional(),
    unitId: z.number().int().positive().optional(),
  })
  .passthrough()

const BexioCustomerMappingSchema = z.object({
  contactId: z.number().int().positive().optional(),
  invoice: BexioInvoiceConfigSchema.default({}),
  position: BexioPositionDefaultsSchema.default({}),
})

const BexioBillingMappingSchema = z.object({
  customers: z.record(BexioCustomerMappingSchema).default({}),
  defaults: z
    .object({
      invoice: BexioInvoiceConfigSchema.default({}),
      position: BexioPositionDefaultsSchema.default({}),
    })
    .default({}),
})

export type BexioLineGroupByAlias = typeof BEXIO_LINE_GROUP_BY_ALIASES[number]
export type BexioInvoiceConfig = z.infer<typeof BexioInvoiceConfigSchema>
export type BexioPositionDefaults = z.infer<typeof BexioPositionDefaultsSchema>
export type BexioCustomerMapping = z.infer<typeof BexioCustomerMappingSchema>
export type BexioBillingMapping = z.infer<typeof BexioBillingMappingSchema>

export interface BexioDraftPosition {
  readonly accountId?: number
  readonly amount: string
  readonly discountInPercent?: number | string
  readonly isOptional?: boolean
  readonly taxId?: number
  readonly text: string
  readonly type: 'custom'
  readonly unitId?: number
  readonly unitPrice: string
}

export interface BexioDraftDocument {
  readonly document: BexioInvoiceConfig
  readonly positions: readonly BexioDraftPosition[]
}

export interface BillingExportLine {
  readonly bexio_position: BexioDraftPosition
  readonly blocking_issues: readonly string[]
  readonly clockodo: {
    readonly duration: number
    readonly duration_hours: number
    readonly hourly_rate: number | null
    readonly hourly_rate_is_equal_and_has_no_lumpsums: boolean
    readonly path: string
    readonly project_name: string | null
    readonly projects_id: number | null
    readonly revenue: number
    readonly service_name: string | null
    readonly services_id: number | null
    readonly text_name: string | null
    readonly texts_id: number | null
  }
  readonly label: string
  readonly pricing_mode: 'flat-revenue' | 'hours-times-rate'
  readonly warnings: readonly string[]
}

export interface BillingExportDocument {
  readonly bexio_contact_id: number | null
  readonly bexio_draft: BexioDraftDocument
  readonly billing_mark_billed_filter: {
    readonly billable: 1
    readonly customer: number
    readonly time_since: string
    readonly time_until: string
  }
  readonly blocking_issues: readonly string[]
  readonly customer: {
    readonly clockodo_customer_id: number
    readonly name: string
  }
  readonly line_count: number
  readonly lines: readonly BillingExportLine[]
  readonly ready: boolean
  readonly totals: {
    readonly duration: number
    readonly duration_hours: number
    readonly revenue: number
  }
  readonly warnings: readonly string[]
}

export interface BillingExportResult {
  readonly blocking_document_count: number
  readonly document_count: number
  readonly documents: readonly BillingExportDocument[]
  readonly format: 'bexio'
  readonly generated_at: string
  readonly line_group_by: readonly BexioLineGroupByAlias[]
  readonly position_count: number
  readonly range: {
    readonly invoice_date: string
    readonly label: string
    readonly time_since: string
    readonly time_until: string
  }
  readonly ready_document_count: number
  readonly row_count: number
  readonly warning_count: number
}

export interface CreateBexioBillingExportOptions {
  readonly invoiceDate: string
  readonly lineGroupBy: readonly BexioLineGroupByAlias[]
  readonly mapping?: BexioBillingMapping
  readonly range: BillingRange
  readonly readyOnly?: boolean
  readonly rows: readonly EntryGroupReportRow[]
}

function formatMoney(value: number): string {
  return value.toFixed(2)
}

function formatHours(duration: number): string {
  return (duration / 3600).toFixed(2)
}

function normalizeInvoiceDate(invoiceDate: string): string {
  const trimmedDate = invoiceDate.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    throw new ValidationError('--invoice-date must use YYYY-MM-DD format.')
  }

  return trimmedDate
}

function buildGeneratedApiReference(
  customerId: number,
  range: BillingRange,
): string {
  return `clockodo:${customerId}:${range.timeSince}:${range.timeUntil}`
}

function buildGeneratedTitle(customerName: string, range: BillingRange): string {
  return `${customerName} ${range.label}`
}

function readAliasValue(
  row: EntryGroupReportRow,
  alias: BexioLineGroupByAlias,
): string | null {
  switch (alias) {
    case 'billable':
      return row.billable === null ? null : String(row.billable)
    case 'day':
      return row.day
    case 'is-lumpsum':
      return row.is_lumpsum === null ? null : row.is_lumpsum ? 'Lump sum' : 'Hourly'
    case 'lumpsum-service':
      return row.lumpsum_service_name ?? row.lumpsum_services_id?.toString() ?? null
    case 'month':
      return row.month
    case 'project':
      return row.project_name ?? row.projects_id?.toString() ?? null
    case 'service':
      return row.service_name ?? row.services_id?.toString() ?? null
    case 'subproject':
      return row.subproject_name ?? row.subprojects_id?.toString() ?? null
    case 'text':
      return row.text_name ?? row.texts_id?.toString() ?? null
    case 'user':
      return row.user_name ?? row.users_id?.toString() ?? null
    case 'week':
      return row.week
    case 'year':
      return row.year
  }
}

function buildLineLabel(
  row: EntryGroupReportRow,
  lineGroupBy: readonly BexioLineGroupByAlias[],
  rangeLabel: string,
): string {
  const parts = lineGroupBy
    .map((alias) => readAliasValue(row, alias))
    .filter((value): value is string => Boolean(value))

  const baseLabel = parts.length > 0 ? parts.join(' / ') : row.leaf_name
  return `${baseLabel} (${rangeLabel})`
}

function mergeInvoiceConfig(
  customerId: number,
  customerName: string,
  invoiceDate: string,
  mapping: BexioBillingMapping | undefined,
  range: BillingRange,
): {
  readonly contactId: number | null
  readonly document: BexioInvoiceConfig
} {
  const customerMapping = mapping?.customers[String(customerId)]
  const generatedDocument: BexioInvoiceConfig = {
    apiReference: buildGeneratedApiReference(customerId, range),
    isValidFrom: invoiceDate,
    reference: range.label,
    title: buildGeneratedTitle(customerName, range),
  }
  const mergedDocument: BexioInvoiceConfig = {
    ...generatedDocument,
    ...(mapping?.defaults.invoice ?? {}),
    ...(customerMapping?.invoice ?? {}),
  }
  const contactId =
    customerMapping?.contactId ?? mergedDocument.contactId ?? null

  if (contactId !== null) {
    mergedDocument.contactId = contactId
  } else {
    delete mergedDocument.contactId
  }

  return {
    contactId,
    document: mergedDocument,
  }
}

function mergePositionDefaults(
  customerId: number,
  mapping: BexioBillingMapping | undefined,
): BexioPositionDefaults {
  return {
    ...(mapping?.defaults.position ?? {}),
    ...(mapping?.customers[String(customerId)]?.position ?? {}),
  }
}

function uniqueMessages(messages: readonly string[]): string[] {
  return [...new Set(messages)]
}

function createLinePosition(
  customerId: number,
  lineGroupBy: readonly BexioLineGroupByAlias[],
  mapping: BexioBillingMapping | undefined,
  range: BillingRange,
  row: EntryGroupReportRow,
): BillingExportLine {
  const positionDefaults = mergePositionDefaults(customerId, mapping)
  const label = buildLineLabel(row, lineGroupBy, range.label)
  const blockingIssues: string[] = []
  const warnings: string[] = []
  const pricingMode =
    row.hourly_rate !== null &&
    row.hourly_rate_is_equal_and_has_no_lumpsums &&
    row.duration > 0
      ? 'hours-times-rate'
      : 'flat-revenue'

  if (positionDefaults.accountId === undefined) {
    blockingIssues.push('Missing Bexio position accountId.')
  }

  if (positionDefaults.taxId === undefined) {
    blockingIssues.push('Missing Bexio position taxId.')
  }

  if (positionDefaults.unitId === undefined) {
    blockingIssues.push('Missing Bexio position unitId.')
  }

  if (pricingMode === 'flat-revenue') {
    warnings.push(
      `Line '${label}' uses flat revenue because Clockodo did not provide a stable hourly rate.`,
    )
  }

  if (row.revenue <= 0) {
    warnings.push(`Line '${label}' has zero or negative revenue.`)
  }

  const bexioPosition: BexioDraftPosition = {
    ...('accountId' in positionDefaults
      ? { accountId: positionDefaults.accountId }
      : {}),
    amount:
      pricingMode === 'hours-times-rate'
        ? formatHours(row.duration)
        : '1.00',
    ...('discountInPercent' in positionDefaults
      ? { discountInPercent: positionDefaults.discountInPercent }
      : {}),
    ...('isOptional' in positionDefaults
      ? { isOptional: positionDefaults.isOptional }
      : {}),
    ...('taxId' in positionDefaults ? { taxId: positionDefaults.taxId } : {}),
    text: label,
    type: 'custom',
    ...('unitId' in positionDefaults ? { unitId: positionDefaults.unitId } : {}),
    unitPrice:
      pricingMode === 'hours-times-rate'
        ? formatMoney(row.hourly_rate ?? 0)
        : formatMoney(row.revenue),
  }

  return {
    bexio_position: bexioPosition,
    blocking_issues: uniqueMessages(blockingIssues),
    clockodo: {
      duration: row.duration,
      duration_hours: row.duration_hours,
      hourly_rate: row.hourly_rate,
      hourly_rate_is_equal_and_has_no_lumpsums:
        row.hourly_rate_is_equal_and_has_no_lumpsums,
      path: row.path,
      project_name: row.project_name,
      projects_id: row.projects_id,
      revenue: row.revenue,
      service_name: row.service_name,
      services_id: row.services_id,
      text_name: row.text_name,
      texts_id: row.texts_id,
    },
    label,
    pricing_mode: pricingMode,
    warnings: uniqueMessages(warnings),
  }
}

function createCustomerDocument(
  customerId: number,
  customerName: string,
  customerRows: readonly EntryGroupReportRow[],
  options: CreateBexioBillingExportOptions,
): BillingExportDocument {
  const { contactId, document } = mergeInvoiceConfig(
    customerId,
    customerName,
    normalizeInvoiceDate(options.invoiceDate),
    options.mapping,
    options.range,
  )
  const lines = customerRows.map((row) =>
    createLinePosition(
      customerId,
      options.lineGroupBy,
      options.mapping,
      options.range,
      row,
    ),
  )
  const blockingIssues = lines.flatMap((line) => line.blocking_issues)
  const warnings = lines.flatMap((line) => line.warnings)

  if (contactId === null) {
    blockingIssues.push(
      `Missing Bexio contactId mapping for Clockodo customer ${customerId}.`,
    )
  }

  const totalDuration = customerRows.reduce((sum, row) => sum + row.duration, 0)
  const totalRevenue = customerRows.reduce((sum, row) => sum + row.revenue, 0)

  return {
    bexio_contact_id: contactId,
    bexio_draft: {
      document,
      positions: lines.map((line) => line.bexio_position),
    },
    billing_mark_billed_filter: {
      billable: 1,
      customer: customerId,
      time_since: options.range.timeSince,
      time_until: options.range.timeUntil,
    },
    blocking_issues: uniqueMessages(blockingIssues),
    customer: {
      clockodo_customer_id: customerId,
      name: customerName,
    },
    line_count: lines.length,
    lines,
    ready: uniqueMessages(blockingIssues).length === 0,
    totals: {
      duration: totalDuration,
      duration_hours: Number((totalDuration / 3600).toFixed(2)),
      revenue: Number(totalRevenue.toFixed(2)),
    },
    warnings: uniqueMessages(warnings),
  }
}

function groupRowsByCustomer(
  rows: readonly EntryGroupReportRow[],
): Map<number, { name: string; rows: EntryGroupReportRow[] }> {
  const groupedRows = new Map<number, { name: string; rows: EntryGroupReportRow[] }>()

  for (const row of rows) {
    if (row.customers_id === null) {
      throw new ValidationError(
        'Bexio export requires customer-grouped Clockodo rows.',
      )
    }

    const customerId = row.customers_id
    const existingGroup = groupedRows.get(customerId)

    if (existingGroup) {
      existingGroup.rows.push(row)
      continue
    }

    groupedRows.set(customerId, {
      name: row.customer_name ?? `Customer ${customerId}`,
      rows: [row],
    })
  }

  return groupedRows
}

export function parseBexioBillingMapping(input: unknown): BexioBillingMapping {
  const parsedMapping = BexioBillingMappingSchema.safeParse(input)

  if (!parsedMapping.success) {
    throw new ValidationError('Bexio billing mapping is invalid.', {
      details: parsedMapping.error.flatten(),
    })
  }

  return parsedMapping.data
}

export function createBexioBillingExport(
  options: CreateBexioBillingExportOptions,
): BillingExportResult {
  const customerGroups = groupRowsByCustomer(options.rows)
  const documents = [...customerGroups.entries()]
    .sort((left, right) => left[1].name.localeCompare(right[1].name))
    .map(([customerId, customerGroup]) =>
      createCustomerDocument(
        customerId,
        customerGroup.name,
        customerGroup.rows,
        options,
      ),
    )
  const filteredDocuments = options.readyOnly
    ? documents.filter((document) => document.ready)
    : documents
  const warningCount = filteredDocuments.reduce(
    (sum, document) => sum + document.warnings.length,
    0,
  )
  const positionCount = filteredDocuments.reduce(
    (sum, document) => sum + document.line_count,
    0,
  )

  return {
    blocking_document_count: filteredDocuments.filter((document) => !document.ready).length,
    document_count: filteredDocuments.length,
    documents: filteredDocuments,
    format: 'bexio',
    generated_at: new Date().toISOString(),
    line_group_by: options.lineGroupBy,
    position_count: positionCount,
    range: {
      invoice_date: normalizeInvoiceDate(options.invoiceDate),
      label: options.range.label,
      time_since: options.range.timeSince,
      time_until: options.range.timeUntil,
    },
    ready_document_count: filteredDocuments.filter((document) => document.ready).length,
    row_count: options.rows.length,
    warning_count: warningCount,
  }
}

export { BEXIO_LINE_GROUP_BY_ALIASES }
