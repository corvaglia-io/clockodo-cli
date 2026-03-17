import { Args, Command } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { ServicesService } from '../../services/clockodo/services.js'

export default class ServicesGet extends Command {
  static override description = 'Get a service by ID'

  static override examples = [
    '<%= config.bin %> services get 123',
    '<%= config.bin %> services get 123 --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Service ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ServicesGet)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new ServicesService(client)
      const clockodoService = await service.get(args.id)

      outputResult(clockodoService, {
        columns: ['id', 'name', 'number', 'active', 'note'],
        json: flags.json,
        title: 'Service',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

