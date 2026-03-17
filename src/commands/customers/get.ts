import { Args, Command } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { CustomersService } from '../../services/clockodo/customers.js'

export default class CustomersGet extends Command {
  static override description = 'Get a customer by ID'

  static override examples = [
    '<%= config.bin %> customers get 123',
    '<%= config.bin %> customers get 123 --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Customer ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CustomersGet)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new CustomersService(client)
      const customer = await service.get(args.id)

      outputResult(customer, {
        columns: ['id', 'name', 'number', 'active', 'billable_default', 'color', 'note'],
        json: flags.json,
        title: 'Customer',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

