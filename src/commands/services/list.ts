import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { ServicesService } from '../../services/clockodo/services.js'

export default class ServicesList extends Command {
  static override description = 'List services'

  static override examples = [
    '<%= config.bin %> services list',
    '<%= config.bin %> services list --active --search consulting',
    '<%= config.bin %> services list --limit 20 --json',
  ]

  static override flags = {
    ...sharedFlags,
    active: Flags.boolean({ description: 'Filter to active services' }),
    limit: Flags.integer({ description: 'Max items per page', min: 1 }),
    page: Flags.integer({ description: 'Page number', min: 1 }),
    search: Flags.string({ description: 'Full-text search' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ServicesList)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new ServicesService(client)
      const result = await service.list({
        active: flags.active,
        fulltext: flags.search,
        itemsPerPage: flags.limit,
        page: flags.page,
      })

      outputResult(result.data, {
        columns: ['id', 'name', 'number', 'active'],
        json: flags.json,
        meta: { paging: result.paging },
        title: 'Services',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

