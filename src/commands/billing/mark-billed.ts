import { Command, Flags } from '@oclif/core'

import { getClockodoAuthContext } from '../../core/auth/auth-manager.js'
import { confirmDestructiveAction } from '../../core/confirm.js'
import { ValidationError } from '../../core/errors/errors.js'
import { handleError } from '../../core/errors/error-handler.js'
import { confirmationFlags, sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { resolveBillingRange } from '../../core/time/billing-range.js'
import {
  BUDGET_OPTION_VALUES,
  EntryGroupsService,
  type BudgetOption,
} from '../../services/clockodo/entry-groups.js'

function describeTarget(
  flags: {
    readonly customer?: number
    readonly project?: number
    readonly service?: number
    readonly text?: string
    readonly user?: number
  },
  rangeLabel: string,
): string {
  const parts = [`range ${rangeLabel}`]

  if (flags.customer) {
    parts.push(`customer ${flags.customer}`)
  }

  if (flags.project) {
    parts.push(`project ${flags.project}`)
  }

  if (flags.service) {
    parts.push(`service ${flags.service}`)
  }

  if (flags.user) {
    parts.push(`user ${flags.user}`)
  }

  if (flags.text) {
    parts.push(`text "${flags.text}"`)
  }

  return parts.join(', ')
}

function parseBudgetType(value: string | undefined): BudgetOption | undefined {
  return value as BudgetOption | undefined
}

export default class BillingMarkBilled extends Command {
  static override description = 'Mark matching Clockodo entries as billed via entry groups'

  static override examples = [
    '<%= config.bin %> billing mark-billed --month 2026-02 --customer 10001',
    '<%= config.bin %> billing mark-billed --last-month --customer 10001 --project 20001 --yes',
    '<%= config.bin %> billing mark-billed --month 2026-02 --customer 10001 --json --yes',
  ]

  static override flags = {
    ...sharedFlags,
    ...confirmationFlags,
    budgetType: Flags.string({
      description: 'Optional Clockodo budget filter',
      options: [...BUDGET_OPTION_VALUES],
    }),
    customer: Flags.integer({ description: 'Filter by customer ID', min: 1 }),
    'last-month': Flags.boolean({
      description: 'Use the previous local calendar month',
    }),
    month: Flags.string({
      description: 'Billing month in YYYY-MM format',
    }),
    project: Flags.integer({ description: 'Filter by project ID', min: 1 }),
    service: Flags.integer({ description: 'Filter by service ID', min: 1 }),
    since: Flags.string({ description: 'Range start date or datetime' }),
    text: Flags.string({ description: 'Filter by entry text' }),
    until: Flags.string({ description: 'Range end date or datetime' }),
    user: Flags.integer({ description: 'Filter by user ID', min: 1 }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(BillingMarkBilled)

    try {
      const range = resolveBillingRange({
        lastMonth: flags['last-month'],
        month: flags.month,
        since: flags.since,
        until: flags.until,
      })
      const target = describeTarget(flags, range.label)

      await confirmDestructiveAction({
        cancelledMessage: 'Mark billed cancelled.',
        noInteractive: flags['no-interactive'],
        prompt: `Mark matching entries as billed for ${target}?`,
        requiredMessage:
          'Mark billed requires confirmation. Re-run with --yes or use an interactive terminal.',
        yes: flags.yes,
      })

      const authContext = await getClockodoAuthContext(flags.profile)
      const client = createClockodoClient(authContext.credentials, {
        debug: flags.debug,
        maxRetries: 0,
        requestPolicy: authContext.requestPolicy,
        requestProfile: authContext.profile,
      })
      const service = new EntryGroupsService(client)

      let result = await service.markBilled({
        filter: {
          budgetType: parseBudgetType(flags.budgetType),
          customersId: flags.customer,
          projectsId: flags.project,
          servicesId: flags.service,
          text: flags.text,
          usersId: flags.user,
        },
        timeSince: range.timeSince,
        timeUntil: range.timeUntil,
      })

      if (result.kind === 'confirmation_required') {
        const confirmedResult = await service.markBilled({
          confirmKey: result.confirm_key,
          filter: {
            budgetType: parseBudgetType(flags.budgetType),
            customersId: flags.customer,
            projectsId: flags.project,
            servicesId: flags.service,
            text: flags.text,
            usersId: flags.user,
          },
          timeSince: range.timeSince,
          timeUntil: range.timeUntil,
        })

        if (confirmedResult.kind !== 'updated') {
          throw new ValidationError(
            'Clockodo requested confirmation again unexpectedly.',
          )
        }

        result = confirmedResult
      }

      if (result.kind !== 'updated') {
        throw new ValidationError(
          'Clockodo requested confirmation again unexpectedly.',
        )
      }

      outputResult(
        {
          edited_entries: result.edited_entries,
          range: range.label,
          success: result.success,
          time_since: range.timeSince,
          time_until: range.timeUntil,
        },
        {
          columns: ['success', 'edited_entries', 'range', 'time_since', 'time_until'],
          json: flags.json,
          title: 'Entries marked billed',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
