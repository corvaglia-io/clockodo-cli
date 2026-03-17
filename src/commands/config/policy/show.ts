import { Command } from '@oclif/core'

import { getProfilePolicy } from '../../../core/config/config-manager.js'
import { handleError } from '../../../core/errors/error-handler.js'
import { sharedFlags } from '../../../core/flags.js'
import { outputResult } from '../../../core/output/writer.js'

export default class ConfigPolicyShow extends Command {
  static override description = 'Show the local CLI write policy for the selected profile'

  static override examples = [
    '<%= config.bin %> config policy show',
    '<%= config.bin %> config policy show --profile work --json',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigPolicyShow)

    try {
      const result = await getProfilePolicy(flags.profile, process.env)
      const policySummary = {
        allow_raw_writes: result.policy.allowRawWrites,
        mode: result.policy.mode,
        profile: result.profile,
        write_allowlist_count: result.policy.writeAllowlist.length,
      }

      if (flags.json) {
        outputResult(
          {
            policy: result.policy,
            profile: result.profile,
          },
          {
            json: true,
          },
        )

        return
      }

      outputResult(policySummary, {
        json: false,
        title: 'CLI Policy',
      })

      if (result.policy.writeAllowlist.length > 0) {
        outputResult(result.policy.writeAllowlist, {
          columns: ['method', 'path'],
          json: false,
          title: 'Write Allowlist',
        })
      }
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
