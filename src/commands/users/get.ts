import { Args, Command } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { UsersService } from '../../services/clockodo/users.js'

export default class UsersGet extends Command {
  static override description = 'Get a user by ID'

  static override examples = [
    '<%= config.bin %> users get 123',
    '<%= config.bin %> users get 123 --json',
  ]

  static override args = {
    id: Args.integer({ description: 'User ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(UsersGet)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new UsersService(client)
      const user = await service.get(args.id)

      outputResult(user, {
        columns: [
          'id',
          'name',
          'email',
          'active',
          'role',
          'teams_id',
          'language',
          'timezone',
          'start_date',
        ],
        json: flags.json,
        title: 'User',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

