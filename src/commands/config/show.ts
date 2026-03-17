import { Command } from '@oclif/core'

import { getEffectiveConfig } from '../../core/config/config-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { outputResult } from '../../core/output/writer.js'

export default class ConfigShow extends Command {
  static override description = 'Show the current effective configuration'

  static override examples = [
    '<%= config.bin %> config show',
    '<%= config.bin %> config show --profile work --json',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigShow)

    try {
      const result = await getEffectiveConfig(process.env, flags.profile)

      if (flags.json) {
        outputResult(result, {
          json: true,
        })

        return
      }

      outputResult(
        {
          active_policy_allow_raw_writes: result.activePolicy.allowRawWrites,
          active_policy_mode: result.activePolicy.mode,
          active_policy_write_allowlist_count:
            result.activePolicy.writeAllowlist.length,
          active_profile: result.activeProfile,
          config_directory: result.configDir,
          config_file: result.configFilePath,
          credentials_file: result.credentialsFilePath,
          debug_enabled: result.debugEnabled,
          default_profile: result.defaultProfile,
          has_config_file: result.hasConfigFile,
          has_credentials_file: result.hasCredentialsFile,
          profiles: result.profiles.join(', '),
        },
        {
          json: false,
          title: 'Configuration',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
