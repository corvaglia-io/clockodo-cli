import { Args, Command } from '@oclif/core'

import { getClockodoAuthContext, getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { confirmDestructiveAction } from '../../core/confirm.js'
import { handleError } from '../../core/errors/error-handler.js'
import { confirmationFlags, sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { toDeletedEntryResult } from '../../core/output/entries.js'
import { outputResult } from '../../core/output/writer.js'
import { EntriesService } from '../../services/clockodo/entries.js'

export default class EntriesDelete extends Command {
  static override description = 'Delete an entry'

  static override examples = [
    '<%= config.bin %> entries delete 123',
    '<%= config.bin %> entries delete 123 --yes',
    '<%= config.bin %> entries delete 123 --yes --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Entry ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
    ...confirmationFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(EntriesDelete)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, {
        debug: flags.debug,
        maxRetries: 0,
      })
      const service = new EntriesService(client)
      const entry = await service.get(args.id)

      await confirmDestructiveAction({
        cancelledMessage: 'Deletion cancelled.',
        noInteractive: flags['no-interactive'],
        prompt: `Delete entry ${entry.id} from ${entry.time_since} to ${entry.time_until ?? 'open end'}?`,
        requiredMessage:
          'Deletion requires confirmation. Re-run with --yes or use an interactive terminal.',
        yes: flags.yes,
      })

      const authContext = await getClockodoAuthContext(flags.profile)
      const guardedClient = createClockodoClient(authContext.credentials, {
        debug: flags.debug,
        maxRetries: 0,
        requestPolicy: authContext.requestPolicy,
        requestProfile: authContext.profile,
      })
      const guardedService = new EntriesService(guardedClient)
      const success = await guardedService.delete(args.id)
      const result = {
        deleted_entry: entry,
        id: args.id,
        success,
      }

      outputResult(flags.json ? result : toDeletedEntryResult(entry), {
        columns: [
          'success',
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
        title: 'Entry deleted',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
