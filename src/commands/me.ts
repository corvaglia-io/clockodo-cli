import { Command } from '@oclif/core'

import { getClockodoCredentials } from '../core/auth/auth-manager.js'
import { handleError } from '../core/errors/error-handler.js'
import { sharedFlags } from '../core/flags.js'
import { createClockodoClient } from '../core/http/client.js'
import { outputResult } from '../core/output/writer.js'
import { MeService } from '../services/clockodo/me.js'

export default class Me extends Command {
  static override description = 'Show the current Clockodo user for the active profile'

  static override examples = [
    '<%= config.bin %> me',
    '<%= config.bin %> me --json',
    '<%= config.bin %> me --profile work',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Me)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new MeService(client)
      const user = await service.getCurrentUser()

      outputResult(user, {
        columns: ['id', 'name', 'email', 'active', 'role', 'timezone'],
        json: flags.json,
        title: 'Current user',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
