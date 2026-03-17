import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { UsersService } from '../../services/clockodo/users.js'

export default class UsersList extends Command {
  static override description = 'List users'

  static override examples = [
    '<%= config.bin %> users list',
    '<%= config.bin %> users list --active --team 12',
    '<%= config.bin %> users list --limit 20 --json',
  ]

  static override flags = {
    ...sharedFlags,
    active: Flags.boolean({ description: 'Filter to active users' }),
    limit: Flags.integer({ description: 'Max items per page', min: 1 }),
    page: Flags.integer({ description: 'Page number', min: 1 }),
    search: Flags.string({ description: 'Full-text search' }),
    team: Flags.integer({ description: 'Filter by team ID', min: 1 }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(UsersList)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new UsersService(client)
      const result = await service.list({
        active: flags.active,
        fulltext: flags.search,
        itemsPerPage: flags.limit,
        page: flags.page,
        teamsId: flags.team,
      })

      outputResult(result.data, {
        columns: ['id', 'name', 'email', 'active', 'role', 'teams_id'],
        json: flags.json,
        meta: { paging: result.paging },
        title: 'Users',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

