import { Command, Flags } from '@oclif/core'

import {
  resolveClockodoAuthStatus,
  resolveClockodoCredentials,
} from '../../core/auth/auth-manager.js'
import {
  loadConfigFile,
  loadCredentialsFile,
} from '../../core/config/config-store.js'
import { handleError } from '../../core/errors/error-handler.js'
import { AuthError } from '../../core/errors/errors.js'
import { sharedFlags } from '../../core/flags.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import type { CurrentUser } from '../../services/clockodo/me.js'
import { MeService } from '../../services/clockodo/me.js'

type ValidationState = 'error' | 'invalid' | 'skipped' | 'valid'

interface AuthStatusResult {
  readonly api_key_present: boolean
  readonly api_key_source: string
  readonly api_user: string | null
  readonly api_user_source: string
  readonly app_email: string | null
  readonly app_email_source: string
  readonly app_name: string | null
  readonly app_name_source: string
  readonly base_url: string
  readonly base_url_source: string
  readonly config_path: string
  readonly configured: boolean
  readonly credentials_path: string
  readonly current_user: CurrentUser | null
  readonly locale: string | null
  readonly locale_source: string
  readonly missing_fields: readonly string[]
  readonly policy_allow_raw_writes: boolean
  readonly policy_mode: string
  readonly policy_write_allowlist_count: number
  readonly profile: string
  readonly profile_source: string
  readonly stored_credentials_updated_at: string | null
  readonly validated: boolean
  readonly validation_message: string | null
  readonly validation_state: ValidationState
}

function toHumanAuthStatus(status: AuthStatusResult): Record<string, unknown> {
  return {
    profile: status.profile,
    profile_source: status.profile_source,
    configured: status.configured,
    validated: status.validated,
    validation_state: status.validation_state,
    validation_message: status.validation_message,
    api_user: status.api_user,
    api_user_source: status.api_user_source,
    api_key_present: status.api_key_present,
    api_key_source: status.api_key_source,
    app_name: status.app_name,
    app_name_source: status.app_name_source,
    app_email: status.app_email,
    app_email_source: status.app_email_source,
    base_url: status.base_url,
    base_url_source: status.base_url_source,
    locale: status.locale,
    locale_source: status.locale_source,
    policy_mode: status.policy_mode,
    policy_allow_raw_writes: status.policy_allow_raw_writes,
    policy_write_allowlist_count: status.policy_write_allowlist_count,
    config_path: status.config_path,
    credentials_path: status.credentials_path,
    stored_credentials_updated_at: status.stored_credentials_updated_at,
    missing_fields:
      status.missing_fields.length > 0 ? status.missing_fields.join(', ') : null,
    current_user_id: status.current_user?.id ?? null,
    current_user_name: status.current_user?.name ?? null,
    current_user_email: status.current_user?.email ?? null,
    current_user_role: status.current_user?.role ?? null,
  }
}

export default class AuthStatus extends Command {
  static override description = 'Show the active authentication profile and validation state'

  static override examples = [
    '<%= config.bin %> auth status',
    '<%= config.bin %> auth status --offline',
    '<%= config.bin %> auth status --profile work --json',
  ]

  static override flags = {
    ...sharedFlags,
    offline: Flags.boolean({
      description: 'Skip the live validation request and inspect local configuration only',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AuthStatus)

    try {
      const [config, credentials] = await Promise.all([
        loadConfigFile(),
        loadCredentialsFile(),
      ])
      const baseStatus = resolveClockodoAuthStatus({
        config,
        credentials,
        profileFlag: flags.profile,
      })

      let currentUser: CurrentUser | null = null
      let validated = false
      let validationMessage: string | null = null
      let validationState: ValidationState = 'skipped'

      if (!flags.offline && baseStatus.configured) {
        try {
          const resolvedCredentials = resolveClockodoCredentials({
            config,
            credentials,
            profileFlag: flags.profile,
          })
          const client = createClockodoClient(resolvedCredentials, {
            debug: flags.debug,
            maxRetries: 0,
          })
          currentUser = await new MeService(client).getCurrentUser()
          validated = true
          validationState = 'valid'
        } catch (error) {
          validationMessage =
            error instanceof Error ? error.message : 'Unable to validate credentials.'
          validationState = error instanceof AuthError ? 'invalid' : 'error'
        }
      }

      const result: AuthStatusResult = {
        ...baseStatus,
        current_user: currentUser,
        validated,
        validation_message: validationMessage,
        validation_state: validationState,
      }

      outputResult(flags.json ? result : toHumanAuthStatus(result), {
        columns: [
          'profile',
          'profile_source',
          'configured',
          'validated',
          'validation_state',
          'validation_message',
          'api_user',
          'api_user_source',
          'api_key_present',
          'api_key_source',
          'app_name',
          'app_name_source',
          'app_email',
          'app_email_source',
          'base_url',
          'base_url_source',
          'locale',
          'locale_source',
          'policy_mode',
          'policy_allow_raw_writes',
          'policy_write_allowlist_count',
          'missing_fields',
          'current_user_id',
          'current_user_name',
          'current_user_email',
          'current_user_role',
          'stored_credentials_updated_at',
          'config_path',
          'credentials_path',
        ],
        json: flags.json,
        title: 'Auth status',
      })
    } catch (error) {
      this.exit(handleError(error, flags.json))
    }
  }
}
