import { Args, Command } from '@oclif/core'

import { addProfileWriteAllowRule } from '../../../core/config/config-manager.js'
import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import { outputResult } from '../../../core/output/writer.js'

export default class ConfigPolicyAllowWrite extends Command {
  static override description = 'Add a write allowlist rule for the selected profile'

  static override examples = [
    "<%= config.bin %> config policy allow-write POST '^/v2/entries$'",
    "<%= config.bin %> config policy allow-write DELETE '^/v2/entries/[0-9]+$' --profile automation --json",
  ]

  static override args = {
    method: Args.string({
      description: 'HTTP method to allow',
      options: ['DELETE', 'PATCH', 'POST', 'PUT'],
      required: true,
    }),
    path: Args.string({
      description: 'Regular expression for the API path to allow',
      required: true,
    }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigPolicyAllowWrite)

    try {
      const result = await addProfileWriteAllowRule(
        flags.profile,
        args.method,
        args.path,
        process.env,
      )

      outputResult(
        {
          allow_rule_method: result.rule.method,
          allow_rule_path: result.rule.path,
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
