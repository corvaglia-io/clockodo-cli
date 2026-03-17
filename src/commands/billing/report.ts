import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import {
  BILLING_REPORT_COLUMNS,
  toHumanBillingReportRows,
} from '../../core/output/billing.js'
import { outputResult } from '../../core/output/writer.js'
import { resolveBillingRange } from '../../core/time/billing-range.js'
import {
  BUDGET_OPTION_VALUES,
  BILLING_GROUP_BY_ALIASES,
  EntryGroupsService,
  flattenEntryGroupReport,
  resolveEntryGroupGroupings,
  type BillingGroupByAlias,
  type BudgetOption,
} from '../../services/clockodo/entry-groups.js'

const DEFAULT_GROUP_BY: readonly BillingGroupByAlias[] = [
  'customer',
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

export default class BillingReport extends Command {
  static override description = 'Extract invoice-ready billing report data from Clockodo'

  static override examples = [
    '<%= config.bin %> billing report --last-month',
    '<%= config.bin %> billing report --month 2026-02 --group-by customer --json',
    '<%= config.bin %> billing report --month 2026-02 --customer 10001 --group-by customer --group-by project',
  ]

  static override flags = {
    ...sharedFlags,
    billable: Flags.string({
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
    'group-by': Flags.string({
      default: [...DEFAULT_GROUP_BY],
      description: 'Grouping order for the report',
      multiple: true,
      options: [...BILLING_GROUP_BY_ALIASES],
    }),
    'last-month': Flags.boolean({
      description: 'Use the previous local calendar month',
    }),
    month: Flags.string({
      description: 'Billing month in YYYY-MM format',
    }),
    project: Flags.integer({ description: 'Filter by project ID', min: 1 }),
    'prepend-customer-to-project-name': Flags.boolean({
      description: 'Ask Clockodo to prefix project group names with the customer name',
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
    const { flags } = await this.parse(BillingReport)

    try {
      const range = resolveBillingRange({
        lastMonth: flags['last-month'],
        month: flags.month,
        since: flags.since,
        until: flags.until,
      })
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
        grouping: resolveEntryGroupGroupings(flags['group-by'] as BillingGroupByAlias[]),
        prependCustomerToProjectName: flags['prepend-customer-to-project-name'],
        roundToMinutes: flags['round-to'],
        timeSince: range.timeSince,
        timeUntil: range.timeUntil,
      })
      const rows = flattenEntryGroupReport(groups)

      outputResult(flags.json ? rows : toHumanBillingReportRows(rows), {
        columns: BILLING_REPORT_COLUMNS,
        json: flags.json,
        meta: {
          group_by: flags['group-by'],
          range: {
            label: range.label,
            time_since: range.timeSince,
            time_until: range.timeUntil,
          },
          row_count: rows.length,
        },
        title: 'Billing report',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
