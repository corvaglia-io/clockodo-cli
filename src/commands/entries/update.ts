import { Args, Command, Flags } from '@oclif/core'

import {
  UPDATE_ENTRY_BILLABLE_VALUES,
  validateBillableFlag,
} from '../../core/entries/write.js'
import { getClockodoAuthContext } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { ENTRY_COLUMNS } from '../../core/output/entries.js'
import { outputResult } from '../../core/output/writer.js'
import { resolveUpdateEntryWindow } from '../../core/time/entry-window.js'
import { EntriesService } from '../../services/clockodo/entries.js'

export default class EntriesUpdate extends Command {
  static override description = 'Update an existing entry'

  static override examples = [
    '<%= config.bin %> entries update 123 --date 2026-03-16 --from 09:15 --to 09:45',
    '<%= config.bin %> entries update 123 --project 20001 --service 30001 --text "Revised note"',
    '<%= config.bin %> entries update 123 --billable 1 --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Entry ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
    billable: Flags.integer({
      description: 'Billable flag: 0, 1, 2, or 12',
    }),
    customer: Flags.integer({
      description: 'Customer ID',
      min: 1,
    }),
    date: Flags.string({
      description: 'Local calendar date in YYYY-MM-DD format',
    }),
    from: Flags.string({
      description: 'Local start time in HH:mm or HH:mm:ss format',
    }),
    project: Flags.integer({
      description: 'Project ID',
      min: 1,
    }),
    service: Flags.integer({
      description: 'Service ID',
      min: 1,
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
      description: 'User ID override',
      min: 1,
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(EntriesUpdate)

    try {
      const timeWindow = resolveUpdateEntryWindow({
        date: flags.date,
        from: flags.from,
        since: flags.since,
        to: flags.to,
        until: flags.until,
      })
      const billable = validateBillableFlag(
        flags.billable,
        UPDATE_ENTRY_BILLABLE_VALUES,
      )
      const authContext = await getClockodoAuthContext(flags.profile)
      const client = createClockodoClient(authContext.credentials, {
        debug: flags.debug,
        maxRetries: 0,
        requestPolicy: authContext.requestPolicy,
        requestProfile: authContext.profile,
      })
      const service = new EntriesService(client)
      const entry = await service.update(args.id, {
        billable,
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
        title: 'Entry updated',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
