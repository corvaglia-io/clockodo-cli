import { Args, Command } from '@oclif/core'

import { setDefaultProfile } from '../../core/config/config-manager.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { outputResult } from '../../core/output/writer.js'

export default class ConfigSetDefault extends Command {
  static override description = 'Set the default Clockodo profile'

  static override examples = [
    '<%= config.bin %> config set-default work',
    '<%= config.bin %> config set-default work --json',
  ]

  static override args = {
    profile: Args.string({
      description: 'Profile name to set as default',
      required: true,
    }),
  }

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigSetDefault)

    try {
      const result = await setDefaultProfile(args.profile, process.env)

      outputResult(
        {
          default_profile: result.defaultProfile ?? args.profile,
          profile_count: Object.keys(result.profiles).length,
        },
        {
          json: flags.json,
          title: 'Configuration',
        },
      )
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
