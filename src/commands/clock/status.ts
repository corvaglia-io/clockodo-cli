import { Command, Flags } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { CLOCK_RESULT_COLUMNS, toHumanClockResult } from '../../core/output/clock.js'
import { outputResult } from '../../core/output/writer.js'
import { ClockService } from '../../services/clockodo/clock.js'

export default class ClockStatusCommand extends Command {
  static override description = 'Show the currently running Clockodo stopwatch entry'

  static override examples = [
    '<%= config.bin %> clock status',
    '<%= config.bin %> clock status --user 40001',
    '<%= config.bin %> clock status --json',
  ]

  static override flags = {
    ...sharedFlags,
    user: Flags.integer({
      description: 'Inspect the running clock for a specific user ID',
      min: 1,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ClockStatusCommand)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new ClockService(client)
      const status = await service.getStatus({ usersId: flags.user })

      outputResult(flags.json ? status : toHumanClockResult(status), {
        columns: CLOCK_RESULT_COLUMNS,
        json: flags.json,
        title: 'Clock status',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
