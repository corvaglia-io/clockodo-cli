import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { ProjectsService } from '../../services/clockodo/projects.js'

export default class ProjectsList extends Command {
  static override description = 'List projects'

  static override examples = [
    '<%= config.bin %> projects list',
    '<%= config.bin %> projects list --customer 42 --active',
    '<%= config.bin %> projects list --completed --json',
  ]

  static override flags = {
    ...sharedFlags,
    active: Flags.boolean({ description: 'Filter to active projects' }),
    completed: Flags.boolean({ description: 'Filter to completed projects' }),
    customer: Flags.integer({ description: 'Filter by customer ID', min: 1 }),
    limit: Flags.integer({ description: 'Max items per page', min: 1 }),
    page: Flags.integer({ description: 'Page number', min: 1 }),
    search: Flags.string({ description: 'Full-text search' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ProjectsList)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new ProjectsService(client)
      const result = await service.list({
        active: flags.active,
        completed: flags.completed,
        customersId: flags.customer,
        fulltext: flags.search,
        itemsPerPage: flags.limit,
        page: flags.page,
      })

      outputResult(result.data, {
        columns: ['id', 'name', 'customers_id', 'number', 'active', 'completed', 'deadline'],
        json: flags.json,
        meta: { paging: result.paging },
        title: 'Projects',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

