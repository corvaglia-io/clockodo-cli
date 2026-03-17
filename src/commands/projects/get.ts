import { Args, Command } from '@oclif/core'

import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { ProjectsService } from '../../services/clockodo/projects.js'

export default class ProjectsGet extends Command {
  static override description = 'Get a project by ID'

  static override examples = [
    '<%= config.bin %> projects get 123',
    '<%= config.bin %> projects get 123 --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Project ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectsGet)

    try {
      const credentials = await getClockodoCredentials(flags.profile)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new ProjectsService(client)
      const project = await service.get(args.id)

      outputResult(project, {
        columns: [
          'id',
          'name',
          'customers_id',
          'number',
          'active',
          'completed',
          'deadline',
          'start_date',
          'note',
        ],
        json: flags.json,
        title: 'Project',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}

