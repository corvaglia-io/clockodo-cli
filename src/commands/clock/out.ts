import { Command } from '@oclif/core'

import { getClockodoAuthContext } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { CLOCK_RESULT_COLUMNS, toHumanClockResult } from '../../core/output/clock.js'
import { outputResult } from '../../core/output/writer.js'
import { ClockService } from '../../services/clockodo/clock.js'

export default class ClockOutCommand extends Command {
  static override description = 'Stop the currently running Clockodo stopwatch'

  static override examples = [
    '<%= config.bin %> clock out',
    '<%= config.bin %> clock out --json',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ClockOutCommand)

    try {
      // Disable automatic retries for mutations so we do not duplicate stopwatch actions.
      const authContext = await getClockodoAuthContext(flags.profile)
      const client = createClockodoClient(authContext.credentials, {
        debug: flags.debug,
        maxRetries: 0,
        requestPolicy: authContext.requestPolicy,
        requestProfile: authContext.profile,
      })
      const service = new ClockService(client)
      const result = await service.stop()

      outputResult(flags.json ? result : toHumanClockResult(result), {
        columns: CLOCK_RESULT_COLUMNS,
        json: flags.json,
        title: 'Clock stopped',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
