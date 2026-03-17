import { Command } from '@oclif/core'

import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import { outputResult } from '../../../core/output/writer.js'
import { listPolicyPresets } from '../../../core/policy/presets.js'

export default class ConfigPolicyPresets extends Command {
  static override description = 'List available local write-policy presets'

  static override examples = [
    '<%= config.bin %> config policy presets',
    '<%= config.bin %> config policy presets --json',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigPolicyPresets)

    try {
      const presets = listPolicyPresets()

      outputResult(
        flags.json
          ? presets
          : presets.map((preset) => ({
              allow_raw_writes: preset.policy.allowRawWrites,
              description: preset.description,
              mode: preset.policy.mode,
              preset: preset.name,
              write_allowlist_count: preset.policy.writeAllowlist.length,
            })),
        {
          columns: [
            'preset',
            'mode',
            'write_allowlist_count',
            'allow_raw_writes',
            'description',
          ],
          json: flags.json,
          title: 'Policy presets',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
