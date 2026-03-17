import { Command } from '@oclif/core'

import { getConfigPaths } from '../../core/config/paths.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { outputResult } from '../../core/output/writer.js'

export default class ConfigPath extends Command {
  static override description = 'Show config and credentials file paths'

  static override examples = [
    '<%= config.bin %> config path',
    '<%= config.bin %> config path --json',
  ]

  static override flags = {
    ...sharedFlags,
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConfigPath)

    try {
      outputResult(getConfigPaths(process.env), {
        json: flags.json,
        title: 'Config Paths',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
