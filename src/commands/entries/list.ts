import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { resolveEntryRange } from '../../core/time/date-range.js'
import { EntriesService } from '../../services/clockodo/entries.js'

export default class EntriesList extends Command {
  static override description = 'List entries for a date range'

  static override examples = [
    '<%= config.bin %> entries list --today',
    '<%= config.bin %> entries list --since 2026-03-16 --until 2026-03-16',
    '<%= config.bin %> entries list --today --user 12 --json',
  ]

  static override flags = {
    ...sharedFlags,
    customer: Flags.integer({ description: 'Filter by customer ID', min: 1 }),
    limit: Flags.integer({ description: 'Max items per page', min: 1 }),
    page: Flags.integer({ description: 'Page number', min: 1 }),
    project: Flags.integer({ description: 'Filter by project ID', min: 1 }),
    service: Flags.integer({ description: 'Filter by service ID', min: 1 }),
    since: Flags.string({ description: 'Range start date or datetime' }),
    text: Flags.string({ description: 'Filter by entry text' }),
    today: Flags.boolean({ description: 'Use the current local day' }),
    until: Flags.string({ description: 'Range end date or datetime' }),
    user: Flags.integer({ description: 'Filter by user ID', min: 1 }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(EntriesList)

    try {
      const range = resolveEntryRange({
        since: flags.since,
        today: flags.today,
        until: flags.until,
      })
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new EntriesService(client)
      const result = await service.list({
        customersId: flags.customer,
        itemsPerPage: flags.limit,
        page: flags.page,
        projectsId: flags.project,
        servicesId: flags.service,
        text: flags.text,
        timeSince: range.timeSince,
        timeUntil: range.timeUntil,
        usersId: flags.user,
      })

      outputResult(result.data, {
        columns: [
          'id',
          'time_since',
          'time_until',
          'customers_id',
          'projects_id',
          'services_id',
          'users_id',
          'text',
        ],
        json: flags.json,
        meta: { paging: result.paging },
        title: 'Entries',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

