import { Command, Flags } from '@oclif/core'

import { getClockodoAuthContext } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { CLOCK_RESULT_COLUMNS, toHumanClockResult } from '../../core/output/clock.js'
import { outputResult } from '../../core/output/writer.js'
import { ClockService } from '../../services/clockodo/clock.js'

export default class ClockInCommand extends Command {
  static override description = 'Start the Clockodo stopwatch'

  static override examples = [
    '<%= config.bin %> clock in --customer 10001 --service 30001',
    '<%= config.bin %> clock in --customer 10001 --service 30001 --project 20001 --text "Daily sync"',
    '<%= config.bin %> clock in --customer 10001 --service 30001 --json',
  ]

  static override flags = {
    ...sharedFlags,
    customer: Flags.integer({
      description: 'Customer ID for the new running entry',
      min: 1,
      required: true,
    }),
    project: Flags.integer({
      description: 'Optional project ID for the new running entry',
      min: 1,
    }),
    service: Flags.integer({
      description: 'Service ID for the new running entry',
      min: 1,
      required: true,
    }),
    text: Flags.string({
      description: 'Optional entry text for the running clock',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ClockInCommand)

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
      const result = await service.start({
        customersId: flags.customer,
        projectsId: flags.project,
        servicesId: flags.service,
        text: flags.text,
      })

      outputResult(flags.json ? result : toHumanClockResult(result), {
        columns: CLOCK_RESULT_COLUMNS,
        json: flags.json,
        title: 'Clock started',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
