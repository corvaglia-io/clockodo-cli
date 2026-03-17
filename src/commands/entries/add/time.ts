import { Command, Flags } from '@oclif/core'

import {
  CREATE_ENTRY_BILLABLE_VALUES,
  validateBillableFlag,
} from '../../../core/entries/write.js'
import { getClockodoAuthContext } from '../../../core/auth/auth-manager.js'
import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import { createClockodoClient } from '../../../core/http/client.js'
import { ENTRY_COLUMNS } from '../../../core/output/entries.js'
import { outputResult } from '../../../core/output/writer.js'
import { resolveCreateEntryWindow } from '../../../core/time/entry-window.js'
import { EntriesService } from '../../../services/clockodo/entries.js'

export default class EntriesAddTime extends Command {
  static override description = 'Create a manual time entry'

  static override examples = [
    '<%= config.bin %> entries add time --customer 10001 --project 20001 --service 30001 --billable 0 --date 2026-03-16 --from 09:00 --to 09:30 --text "Daily review"',
    '<%= config.bin %> entries add time --customer 10001 --project 20001 --service 30001 --billable 1 --since 2026-03-16T09:00 --until 2026-03-16T09:30 --json',
  ]

  static override flags = {
    ...sharedFlags,
    billable: Flags.integer({
      description: 'Billable flag: 0 = not billable, 1 = billable',
      required: true,
    }),
    customer: Flags.integer({
      description: 'Customer ID',
      min: 1,
      required: true,
    }),
    date: Flags.string({
      description: 'Local calendar date in YYYY-MM-DD format',
    }),
    from: Flags.string({
      description: 'Local start time in HH:mm or HH:mm:ss format',
    }),
    project: Flags.integer({
      description: 'Optional project ID',
      min: 1,
    }),
    service: Flags.integer({
      description: 'Service ID',
      min: 1,
      required: true,
    }),
    since: Flags.string({
      description: 'Explicit start datetime',
    }),
    text: Flags.string({
      description: 'Entry text',
    }),
    to: Flags.string({
      description: 'Local end time in HH:mm or HH:mm:ss format',
    }),
    until: Flags.string({
      description: 'Explicit end datetime',
    }),
    user: Flags.integer({
      description: 'Optional user ID override',
      min: 1,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(EntriesAddTime)

    try {
      const timeWindow = resolveCreateEntryWindow({
        date: flags.date,
        from: flags.from,
        since: flags.since,
        to: flags.to,
        until: flags.until,
      })
      const billable = validateBillableFlag(
        flags.billable,
        CREATE_ENTRY_BILLABLE_VALUES,
      )
      const authContext = await getClockodoAuthContext(flags.profile)
      const client = createClockodoClient(authContext.credentials, {
        debug: flags.debug,
        maxRetries: 0,
        requestPolicy: authContext.requestPolicy,
        requestProfile: authContext.profile,
      })
      const service = new EntriesService(client)
      const entry = await service.createTimeEntry({
        billable: billable!,
        customersId: flags.customer,
        projectsId: flags.project,
        servicesId: flags.service,
        text: flags.text,
        timeSince: timeWindow.timeSince,
        timeUntil: timeWindow.timeUntil,
        usersId: flags.user,
      })

      outputResult(entry, {
        columns: ENTRY_COLUMNS,
        json: flags.json,
        title: 'Entry created',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
