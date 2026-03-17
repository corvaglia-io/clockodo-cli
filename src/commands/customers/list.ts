import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { CustomersService } from '../../services/clockodo/customers.js'

export default class CustomersList extends Command {
  static override description = 'List customers'

  static override examples = [
    '<%= config.bin %> customers list',
    '<%= config.bin %> customers list --active --search acme',
    '<%= config.bin %> customers list --limit 20 --json',
  ]

  static override flags = {
    ...sharedFlags,
    active: Flags.boolean({ description: 'Filter to active customers' }),
    limit: Flags.integer({ description: 'Max items per page', min: 1 }),
    page: Flags.integer({ description: 'Page number', min: 1 }),
    search: Flags.string({ description: 'Full-text search' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CustomersList)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new CustomersService(client)
      const result = await service.list({
        active: flags.active,
        fulltext: flags.search,
        itemsPerPage: flags.limit,
        page: flags.page,
      })

      outputResult(result.data, {
        columns: ['id', 'name', 'number', 'active', 'billable_default', 'color'],
        json: flags.json,
        meta: { paging: result.paging },
        title: 'Customers',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

