import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { loadJsonFile } from '../../core/input/json-input.js'
import {
  BILLING_EXPORT_COLUMNS,
  toHumanBillingExportRows,
} from '../../core/output/billing-export.js'
import { outputResult } from '../../core/output/writer.js'
import { resolveBillingRange } from '../../core/time/billing-range.js'
import {
  BEXIO_LINE_GROUP_BY_ALIASES,
  createBexioBillingExport,
  parseBexioBillingMapping,
  type BexioLineGroupByAlias,
} from '../../services/clockodo/billing-export.js'
import {
  BUDGET_OPTION_VALUES,
  EntryGroupsService,
  flattenEntryGroupReport,
  resolveEntryGroupGroupings,
  type BudgetOption,
} from '../../services/clockodo/entry-groups.js'

const DEFAULT_LINE_GROUP_BY: readonly BexioLineGroupByAlias[] = [
  'project',
  'service',
] as const

function parseBillableFilter(value: string | undefined): 0 | 1 | 2 | undefined {
  if (value === undefined) {
    return undefined
  }

  return Number(value) as 0 | 1 | 2
}

function parseBudgetType(value: string | undefined): BudgetOption | undefined {
  return value as BudgetOption | undefined
}

function formatLocalDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default class BillingExport extends Command {
  static override description =
    'Export monthly billing data as Bexio-ready invoice draft bundles'

  static override examples = [
    '<%= config.bin %> billing export --last-month --format bexio --json',
    '<%= config.bin %> billing export --month 2026-02 --mapping-file ./billing-map.json --json',
    '<%= config.bin %> billing export --month 2026-02 --customer 10001 --mapping-file ./billing-map.json --ready-only',
  ]

  static override flags = {
    ...sharedFlags,
    billable: Flags.string({
      default: '1',
      description: 'Filter by billable state: 0 = not billable, 1 = billable, 2 = billed',
      options: ['0', '1', '2'],
    }),
    budgetType: Flags.string({
      description: 'Optional Clockodo budget filter',
      options: [...BUDGET_OPTION_VALUES],
    }),
    calcHardBudgetRevenue: Flags.boolean({
      description: 'Ask Clockodo to also calculate revenues for projects with hard budget',
    }),
    customer: Flags.integer({ description: 'Filter by customer ID', min: 1 }),
    format: Flags.string({
      default: 'bexio',
      description: 'Export format',
      options: ['bexio'],
    }),
    'invoice-date': Flags.string({
      default: formatLocalDate(new Date()),
      description: 'Invoice date for generated Bexio drafts (YYYY-MM-DD)',
    }),
    'last-month': Flags.boolean({
      description: 'Use the previous local calendar month',
    }),
    'line-group-by': Flags.string({
      default: [...DEFAULT_LINE_GROUP_BY],
      description: 'Grouping used for invoice positions inside each customer invoice',
      multiple: true,
      options: [...BEXIO_LINE_GROUP_BY_ALIASES],
    }),
    'mapping-file': Flags.string({
      description: 'Path to a JSON file with Clockodo customer to Bexio contact mappings',
    }),
    month: Flags.string({
      description: 'Billing month in YYYY-MM format',
    }),
    project: Flags.integer({ description: 'Filter by project ID', min: 1 }),
    readyOnly: Flags.boolean({
      description: 'Only include invoice drafts that have enough mapping data to create in Bexio',
    }),
    'round-to': Flags.integer({
      description: 'Round grouped durations to whole minutes',
      min: 1,
    }),
    service: Flags.integer({ description: 'Filter by service ID', min: 1 }),
    since: Flags.string({ description: 'Range start date or datetime' }),
    text: Flags.string({ description: 'Filter by entry text' }),
    until: Flags.string({ description: 'Range end date or datetime' }),
    user: Flags.integer({ description: 'Filter by user ID', min: 1 }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(BillingExport)

    try {
      void flags.format
      const range = resolveBillingRange({
        lastMonth: flags['last-month'],
        month: flags.month,
        since: flags.since,
        until: flags.until,
      })
      const mapping = flags['mapping-file']
        ? parseBexioBillingMapping(await loadJsonFile(flags['mapping-file']))
        : undefined
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new EntryGroupsService(client)
      const groups = await service.listReport({
        calcAlsoRevenuesForProjectsWithHardBudget: flags.calcHardBudgetRevenue,
        filter: {
          billable: parseBillableFilter(flags.billable),
          budgetType: parseBudgetType(flags.budgetType),
          customersId: flags.customer,
          projectsId: flags.project,
          servicesId: flags.service,
          text: flags.text,
          usersId: flags.user,
        },
        grouping: resolveEntryGroupGroupings([
          'customer',
          ...(flags['line-group-by'] as BexioLineGroupByAlias[]),
        ]),
        roundToMinutes: flags['round-to'],
        timeSince: range.timeSince,
        timeUntil: range.timeUntil,
      })
      const rows = flattenEntryGroupReport(groups)
      const exportBundle = createBexioBillingExport({
        invoiceDate: flags['invoice-date'],
        lineGroupBy: flags['line-group-by'] as BexioLineGroupByAlias[],
        mapping,
        range,
        readyOnly: flags.readyOnly,
        rows,
      })

      outputResult(
        flags.json
          ? exportBundle
          : toHumanBillingExportRows(exportBundle.documents),
        {
          columns: BILLING_EXPORT_COLUMNS,
          json: flags.json,
          meta: flags.json
            ? undefined
            : {
                blocking_document_count: exportBundle.blocking_document_count,
                document_count: exportBundle.document_count,
                ready_document_count: exportBundle.ready_document_count,
                warning_count: exportBundle.warning_count,
              },
          title: 'Billing export',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
