import { Args, Command } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { EntriesService } from '../../services/clockodo/entries.js'

export default class EntriesGet extends Command {
  static override description = 'Get an entry by ID'

  static override examples = [
    '<%= config.bin %> entries get 123',
    '<%= config.bin %> entries get 123 --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Entry ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(EntriesGet)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new EntriesService(client)
      const entry = await service.get(args.id)

      outputResult(entry, {
        columns: [
          'id',
          'time_since',
          'time_until',
          'customers_id',
          'projects_id',
          'services_id',
          'users_id',
          'duration',
          'text',
        ],
        json: flags.json,
        title: 'Entry',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

