import { Command } from '@oclif/core'

import { logout } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { outputResult } from '../../core/output/writer.js'

export default class AuthLogout extends Command {
  static override description = 'Remove stored Clockodo credentials for a profile'

  static override examples = [
    '<%= config.bin %> auth logout',
    '<%= config.bin %> auth logout --profile work --json',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLogout)

    try {
      const result = await logout(flags.profile, process.env)

      outputResult(result, {
        json: flags.json,
        title: 'Authentication',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
