import { Args, Command, Flags } from '@oclif/core'

import {
  getClockodoAuthContext,
} from '../../core/auth/auth-manager.js'
import { confirmDestructiveAction } from '../../core/confirm.js'
import { ValidationError } from '../../core/errors/errors.js'
import { handleError } from '../../core/errors/error-handler.js'
import { confirmationFlags, sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { ProjectsService } from '../../services/clockodo/projects.js'

function parseBilledAmount(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError('--amount must be a non-negative number.')
  }

  return parsed
}

export default class ProjectsMarkBilled extends Command {
  static override description = 'Mark a project as billed'

  static override examples = [
    '<%= config.bin %> projects mark-billed 20001',
    '<%= config.bin %> projects mark-billed 20001 --amount 2500',
    '<%= config.bin %> projects mark-billed 20001 --amount 2500 --yes --json',
  ]

  static override args = {
    id: Args.integer({ description: 'Project ID', required: true }),
  }

  static override flags = {
    ...sharedFlags,
    ...confirmationFlags,
    amount: Flags.string({
      description: 'Optional billed amount for hard-budget projects',
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProjectsMarkBilled)

    try {
      const billedMoney = parseBilledAmount(flags.amount)
      const authContext = await getClockodoAuthContext(flags.profile)
      const client = createClockodoClient(authContext.credentials, {
        debug: flags.debug,
        maxRetries: 0,
        requestPolicy: authContext.requestPolicy,
        requestProfile: authContext.profile,
      })
      const service = new ProjectsService(client)
      const project = await service.get(args.id)

      await confirmDestructiveAction({
        cancelledMessage: 'Project mark billed cancelled.',
        noInteractive: flags['no-interactive'],
        prompt: `Mark project ${project.id} (${project.name}) as billed${billedMoney === undefined ? '' : ` with amount ${billedMoney}`}?`,
        requiredMessage:
          'Project mark billed requires confirmation. Re-run with --yes or use an interactive terminal.',
        yes: flags.yes,
      })

      const updatedProject = await service.setBilled(args.id, {
        billedMoney,
      })

      outputResult(
        flags.json
          ? updatedProject
          : {
              billed_completely: updatedProject.billed_completely ?? null,
              billed_money: updatedProject.billed_money ?? null,
              customers_id: updatedProject.customers_id,
              id: updatedProject.id,
              name: updatedProject.name,
            },
        {
          columns: ['id', 'name', 'customers_id', 'billed_money', 'billed_completely'],
          json: flags.json,
          title: 'Project marked billed',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
