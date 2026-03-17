import { Args, Command } from '@oclif/core'

import { applyPolicyPreset } from '../../../core/config/config-manager.js'
import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import {
  POLICY_PRESET_NAMES,
  getPolicyPreset,
} from '../../../core/policy/presets.js'
import { outputResult } from '../../../core/output/writer.js'

export default class ConfigPolicyApplyPreset extends Command {
  static override description = 'Apply a local write-policy preset to the selected profile'

  static override examples = [
    '<%= config.bin %> config policy apply-preset read-only',
    '<%= config.bin %> config policy apply-preset timesheet-write --profile work',
    '<%= config.bin %> config policy apply-preset billing-write --profile automation --json',
  ]

  static override args = {
    preset: Args.string({
      description: 'Policy preset name',
      options: [...POLICY_PRESET_NAMES],
      required: true,
    }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigPolicyApplyPreset)

    try {
      const preset = getPolicyPreset(args.preset as (typeof POLICY_PRESET_NAMES)[number])
      const result = await applyPolicyPreset(
        flags.profile,
        preset.name,
        process.env,
      )

      outputResult(
        {
          allow_raw_writes: result.policy.allowRawWrites,
          description: preset.description,
          mode: result.policy.mode,
          preset: result.preset,
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
