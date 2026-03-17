import path from 'node:path'

import { ConfigurationError } from '../errors/errors.js'

export interface ConfigPaths {
  readonly configDir: string
  readonly configFilePath: string
  readonly credentialsFilePath: string
}

export function getConfigDir(environment: NodeJS.ProcessEnv = process.env): string {
  const xdgConfigHome = environment.XDG_CONFIG_HOME

  if (xdgConfigHome) {
    return path.join(xdgConfigHome, 'clockodo-cli')
  }

  const homeDirectory = environment.HOME

  if (!homeDirectory) {
    throw new ConfigurationError(
      'Unable to determine the config directory because $HOME is not set.',
    )
  }

  return path.join(homeDirectory, '.config', 'clockodo-cli')
}

export function getConfigPaths(environment: NodeJS.ProcessEnv = process.env): ConfigPaths {
  const configDir = getConfigDir(environment)

  return {
    configDir,
    configFilePath: path.join(configDir, 'config.json'),
    credentialsFilePath: path.join(configDir, 'credentials.json'),
  }
}

