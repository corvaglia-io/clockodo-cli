import { Args, Command } from '@oclif/core'

import { removeProfileWriteAllowRule } from '../../../core/config/config-manager.js'
import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import { outputResult } from '../../../core/output/writer.js'

export default class ConfigPolicyRemoveWrite extends Command {
  static override description = 'Remove a write allowlist rule for the selected profile'

  static override examples = [
    "<%= config.bin %> config policy remove-write POST '^/v2/entries$'",
    "<%= config.bin %> config policy remove-write DELETE '^/v2/entries/[0-9]+$' --profile automation --json",
  ]

  static override args = {
    method: Args.string({
      description: 'HTTP method to remove',
      options: ['DELETE', 'PATCH', 'POST', 'PUT'],
      required: true,
    }),
    path: Args.string({
      description: 'Regular expression for the API path to remove',
      required: true,
    }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigPolicyRemoveWrite)

    try {
      const result = await removeProfileWriteAllowRule(
        flags.profile,
        args.method,
        args.path,
        process.env,
      )

      outputResult(
        {
          removed: result.removed,
          removed_rule_method: result.rule.method,
          removed_rule_path: result.rule.path,
          mode: result.policy.mode,
          profile: result.profile,
          write_allowlist_count: result.policy.writeAllowlist.length,
        },
        {
          json: flags.json,
          title: 'CLI Policy',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
