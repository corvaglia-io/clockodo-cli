import { Command, Flags } from '@oclif/core'

import {
  type AuthLoginOptions,
  login,
} from '../../core/auth/auth-manager.js'
import {
  promptForSecretValue,
  promptForTextValue,
} from '../../core/auth/credential-prompt.js'
import { handleError } from '../../core/errors/error-handler.js'
import { sharedFlags } from '../../core/flags.js'
import { outputResult } from '../../core/output/writer.js'

export default class AuthLogin extends Command {
  static override description = 'Validate and store Clockodo credentials for a profile'

  static override examples = [
    '<%= config.bin %> auth login',
    '<%= config.bin %> auth login --profile work --api-user you@example.com --api-key <key> --app-name "Clockodo CLI" --app-email you@example.com --json',
  ]

  static override flags = {
    ...sharedFlags,
    'api-key': Flags.string({
      description: 'Clockodo API key to store',
    }),
    'api-user': Flags.string({
      description: 'Clockodo API user email',
    }),
    'app-email': Flags.string({
      description: 'External application contact email',
    }),
    'app-name': Flags.string({
      description: 'External application name',
    }),
    'base-url': Flags.string({
      description: 'Clockodo API base URL',
      env: 'CLOCKODO_BASE_URL',
    }),
    locale: Flags.string({
      description: 'Preferred Clockodo locale',
      env: 'CLOCKODO_LOCALE',
    }),
    'set-default': Flags.boolean({
      description: 'Set the selected profile as the default profile',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthLogin)

    try {
      const apiUser =
        flags['api-user'] ??
        process.env.CLOCKODO_API_USER ??
        (await promptForTextValue(
          'Clockodo API user: ',
          'Clockodo API user is required. Pass --api-user or run the command in a TTY.',
        ))
      const apiKey =
        flags['api-key'] ??
        process.env.CLOCKODO_API_KEY ??
        (await promptForSecretValue(
          'Clockodo API key: ',
          'Clockodo API key is required. Pass --api-key or run the command in a TTY.',
        ))
      const appName =
        flags['app-name'] ??
        process.env.CLOCKODO_APP_NAME ??
        (await promptForTextValue(
          'App name: ',
          'Clockodo app name is required. Pass --app-name or run the command in a TTY.',
        ))
      const appEmail =
        flags['app-email'] ??
        process.env.CLOCKODO_APP_EMAIL ??
        (await promptForTextValue(
          'App email: ',
          'Clockodo app email is required. Pass --app-email or run the command in a TTY.',
        ))
      const loginOptions: AuthLoginOptions = {
        apiKey,
        apiUser,
        appEmail,
        appName,
        ...(flags['base-url'] ? { baseUrl: flags['base-url'] } : {}),
        ...(flags.debug !== undefined ? { debug: flags.debug } : {}),
        ...(flags.locale ? { locale: flags.locale } : {}),
        ...(flags.profile ? { profile: flags.profile } : {}),
        ...(flags['set-default'] ? { setDefault: true } : {}),
      }

      const result = await login(loginOptions, process.env)

      outputResult(result, {
        json: flags.json,
        title: 'Authentication',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
