import { Args, Command } from '@oclif/core'

import { setProfilePolicyMode } from '../../../core/config/config-manager.js'
import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import { outputResult } from '../../../core/output/writer.js'

export default class ConfigPolicySetMode extends Command {
  static override description = 'Set the local CLI write policy mode for the selected profile'

  static override examples = [
    '<%= config.bin %> config policy set-mode read-only',
    '<%= config.bin %> config policy set-mode allow-listed-writes --profile automation --json',
    '<%= config.bin %> config policy set-mode full-access --profile sandbox',
  ]

  static override args = {
    mode: Args.string({
      description: 'Policy mode',
      options: ['allow-listed-writes', 'full-access', 'read-only'],
      required: true,
    }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigPolicySetMode)

    try {
      const result = await setProfilePolicyMode(
        flags.profile,
        args.mode as 'allow-listed-writes' | 'full-access' | 'read-only',
        process.env,
      )

      outputResult(
        {
          allow_raw_writes: result.policy.allowRawWrites,
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
