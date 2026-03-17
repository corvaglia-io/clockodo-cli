import {
  ensureProfile,
  getProfilePolicy,
  normalizeProfileName,
  removeProfileCredentials,
  resolveActiveProfile,
  saveProfileCredentials,
  saveProfileSettings,
  setDefaultProfile,
} from '../config/config-manager.js'
import { loadConfigFile, loadCredentialsFile } from '../config/config-store.js'
import { getConfigPaths } from '../config/paths.js'
import type {
  ClockodoCredentials,
  ConfigFile,
  CredentialsFile,
  ProfileRequestPolicy,
} from '../config/types.js'
import { ConfigurationError } from '../errors/errors.js'
import { createClockodoClient } from '../http/client.js'
import { createDefaultProfileRequestPolicy } from '../policy/request-policy.js'
import type { CurrentUser } from '../../services/clockodo/me.js'
import { MeService } from '../../services/clockodo/me.js'

const DEFAULT_BASE_URL = 'https://my.clockodo.com/api'

export type CredentialValueSource = 'env' | 'missing' | 'profile'
export type ProfileSelectionSource =
  | 'config'
  | 'credentials'
  | 'default'
  | 'env'
  | 'flag'
export type SettingValueSource = 'default' | 'env' | 'missing' | 'profile'

export interface ClockodoAuthStatus {
  readonly api_key_present: boolean
  readonly api_key_source: CredentialValueSource
  readonly api_user: string | null
  readonly api_user_source: CredentialValueSource
  readonly app_email: string | null
  readonly app_email_source: CredentialValueSource
  readonly app_name: string | null
  readonly app_name_source: CredentialValueSource
  readonly base_url: string
  readonly base_url_source: Exclude<SettingValueSource, 'missing'>
  readonly config_path: string
  readonly configured: boolean
  readonly credentials_path: string
  readonly locale: string | null
  readonly locale_source: Exclude<SettingValueSource, 'default'> | 'missing'
  readonly missing_fields: readonly string[]
  readonly policy_allow_raw_writes: boolean
  readonly policy_mode: ProfileRequestPolicy['mode']
  readonly policy_write_allowlist_count: number
  readonly profile: string
  readonly profile_source: ProfileSelectionSource
  readonly stored_credentials_updated_at: string | null
}

export interface ClockodoAuthContext {
  readonly credentials: ClockodoCredentials
  readonly profile: string
  readonly requestPolicy: ProfileRequestPolicy
}

export interface AuthLoginOptions {
  readonly apiKey: string
  readonly apiUser: string
  readonly appEmail: string
  readonly appName: string
  readonly baseUrl?: string
  readonly debug?: boolean
  readonly locale?: string
  readonly profile?: string
  readonly setDefault?: boolean
}

export interface AuthDependencies {
  readonly validateCredentials?: (
    credentials: ClockodoCredentials,
    debug?: boolean,
  ) => Promise<CurrentUser>
}

export interface AuthLoginResult {
  readonly api_user: string
  readonly app_email: string
  readonly app_name: string
  readonly base_url: string
  readonly current_user: CurrentUser
  readonly locale: string | null
  readonly profile: string
  readonly set_as_default: boolean
}

export interface LogoutResult {
  readonly profile: string
  readonly removed: boolean
}

interface ResolveClockodoCredentialsOptions {
  readonly config: ConfigFile
  readonly credentials: CredentialsFile
  readonly environment?: NodeJS.ProcessEnv
  readonly profileFlag?: string
}

interface ResolvedField<TSource extends string> {
  readonly source: TSource
  readonly value?: string
}

interface ResolvedProfileSelection {
  readonly source: ProfileSelectionSource
  readonly value: string
}

interface ResolvedAuthState {
  readonly apiKey: ResolvedField<CredentialValueSource>
  readonly apiUser: ResolvedField<CredentialValueSource>
  readonly appEmail: ResolvedField<CredentialValueSource>
  readonly appName: ResolvedField<CredentialValueSource>
  readonly baseUrl: ResolvedField<Exclude<SettingValueSource, 'missing'>>
  readonly locale: ResolvedField<Exclude<SettingValueSource, 'default'> | 'missing'>
  readonly profile: ResolvedProfileSelection
}

function normalizeValue(value: string | undefined): string | undefined {
  if (value === undefined || value === '') {
    return undefined
  }

  return value
}

function resolveProfileSelection(
  config: ConfigFile,
  credentials: CredentialsFile,
  environment: NodeJS.ProcessEnv,
  profileFlag?: string,
): ResolvedProfileSelection {
  const flagProfile = normalizeValue(profileFlag)

  if (flagProfile) {
    return {
      source: 'flag',
      value: normalizeProfileName(flagProfile),
    }
  }

  const environmentProfile = normalizeValue(environment.CLOCKODO_PROFILE)

  if (environmentProfile) {
    return {
      source: 'env',
      value: normalizeProfileName(environmentProfile),
    }
  }

  const defaultProfile = normalizeValue(config.defaultProfile)

  if (defaultProfile) {
    return {
      source: 'config',
      value: normalizeProfileName(defaultProfile),
    }
  }

  const firstCredentialsProfile = Object.keys(credentials.profiles)[0]

  if (firstCredentialsProfile) {
    return {
      source: 'credentials',
      value: firstCredentialsProfile,
    }
  }

  const firstConfigProfile = Object.keys(config.profiles)[0]

  if (firstConfigProfile) {
    return {
      source: 'config',
      value: firstConfigProfile,
    }
  }

  return {
    source: 'default',
    value: 'default',
  }
}

function resolveCredentialField(
  environmentValue: string | undefined,
  storedValue: string | undefined,
): ResolvedField<CredentialValueSource> {
  const normalizedEnvironmentValue = normalizeValue(environmentValue)

  if (normalizedEnvironmentValue) {
    return {
      source: 'env',
      value: normalizedEnvironmentValue,
    }
  }

  const normalizedStoredValue = normalizeValue(storedValue)

  if (normalizedStoredValue) {
    return {
      source: 'profile',
      value: normalizedStoredValue,
    }
  }

  return {
    source: 'missing',
  }
}

function resolveBaseUrl(
  environment: NodeJS.ProcessEnv,
  storedProfileConfig: ConfigFile['profiles'][string] | undefined,
): ResolvedField<Exclude<SettingValueSource, 'missing'>> {
  const environmentBaseUrl = normalizeValue(environment.CLOCKODO_BASE_URL)

  if (environmentBaseUrl) {
    return {
      source: 'env',
      value: environmentBaseUrl,
    }
  }

  const storedBaseUrl = normalizeValue(storedProfileConfig?.baseUrl)

  if (storedBaseUrl) {
    return {
      source: 'profile',
      value: storedBaseUrl,
    }
  }

  return {
    source: 'default',
    value: DEFAULT_BASE_URL,
  }
}

function resolveLocale(
  environment: NodeJS.ProcessEnv,
  storedProfileConfig: ConfigFile['profiles'][string] | undefined,
): ResolvedField<Exclude<SettingValueSource, 'default'> | 'missing'> {
  const environmentLocale = normalizeValue(environment.CLOCKODO_LOCALE)

  if (environmentLocale) {
    return {
      source: 'env',
      value: environmentLocale,
    }
  }

  const storedLocale = normalizeValue(storedProfileConfig?.locale)

  if (storedLocale) {
    return {
      source: 'profile',
      value: storedLocale,
    }
  }

  return {
    source: 'missing',
  }
}

function resolveAuthState(
  options: ResolveClockodoCredentialsOptions,
): ResolvedAuthState {
  const environment = options.environment ?? process.env
  const profile = resolveProfileSelection(
    options.config,
    options.credentials,
    environment,
    options.profileFlag,
  )
  const storedCredentials = options.credentials.profiles[profile.value]
  const storedProfileConfig = options.config.profiles[profile.value]

  return {
    apiKey: resolveCredentialField(environment.CLOCKODO_API_KEY, storedCredentials?.apiKey),
    apiUser: resolveCredentialField(environment.CLOCKODO_API_USER, storedCredentials?.apiUser),
    appEmail: resolveCredentialField(
      environment.CLOCKODO_APP_EMAIL,
      storedCredentials?.appEmail,
    ),
    appName: resolveCredentialField(
      environment.CLOCKODO_APP_NAME,
      storedCredentials?.appName,
    ),
    baseUrl: resolveBaseUrl(environment, storedProfileConfig),
    locale: resolveLocale(environment, storedProfileConfig),
    profile,
  }
}

function getMissingCredentialFields(state: ResolvedAuthState): string[] {
  const missingFields: string[] = []

  if (!state.apiUser.value) {
    missingFields.push('api_user')
  }

  if (!state.apiKey.value) {
    missingFields.push('api_key')
  }

  if (!state.appName.value) {
    missingFields.push('app_name')
  }

  if (!state.appEmail.value) {
    missingFields.push('app_email')
  }

  return missingFields
}

export function resolveClockodoAuthStatus(
  options: ResolveClockodoCredentialsOptions,
): ClockodoAuthStatus {
  const environment = options.environment ?? process.env
  const state = resolveAuthState(options)
  const missingFields = getMissingCredentialFields(state)
  const { configPath, credentialsPath } = resolveConfigPaths(environment)
  const storedCredentials = options.credentials.profiles[state.profile.value]
  const profilePolicy =
    options.config.profiles[state.profile.value]?.policy
      ?? createDefaultProfileRequestPolicy()

  return {
    api_key_present: Boolean(state.apiKey.value),
    api_key_source: state.apiKey.source,
    api_user: state.apiUser.value ?? null,
    api_user_source: state.apiUser.source,
    app_email: state.appEmail.value ?? null,
    app_email_source: state.appEmail.source,
    app_name: state.appName.value ?? null,
    app_name_source: state.appName.source,
    base_url: state.baseUrl.value!,
    base_url_source: state.baseUrl.source,
    config_path: configPath,
    configured: missingFields.length === 0,
    credentials_path: credentialsPath,
    locale: state.locale.value ?? null,
    locale_source: state.locale.source,
    missing_fields: missingFields,
    policy_allow_raw_writes: profilePolicy.allowRawWrites,
    policy_mode: profilePolicy.mode,
    policy_write_allowlist_count: profilePolicy.writeAllowlist.length,
    profile: state.profile.value,
    profile_source: state.profile.source,
    stored_credentials_updated_at: storedCredentials?.updatedAt ?? null,
  }
}

export function resolveClockodoCredentials(
  options: ResolveClockodoCredentialsOptions,
): ClockodoCredentials {
  const state = resolveAuthState(options)

  if (!state.apiUser.value) {
    throw new ConfigurationError(
      'Clockodo API user is missing. Set CLOCKODO_API_USER or configure a profile.',
    )
  }

  if (!state.apiKey.value) {
    throw new ConfigurationError(
      'Clockodo API key is missing. Set CLOCKODO_API_KEY or configure a profile.',
    )
  }

  if (!state.appName.value) {
    throw new ConfigurationError(
      'Clockodo app name is missing. Set CLOCKODO_APP_NAME or configure a profile.',
    )
  }

  if (!state.appEmail.value) {
    throw new ConfigurationError(
      'Clockodo app email is missing. Set CLOCKODO_APP_EMAIL or configure a profile.',
    )
  }

  return {
    apiUser: state.apiUser.value,
    apiKey: state.apiKey.value,
    appName: state.appName.value,
    appEmail: state.appEmail.value,
    baseUrl: state.baseUrl.value!,
    locale: state.locale.value,
    profile: state.profile.value,
  }
}

export async function getClockodoCredentials(
  profileFlag?: string,
): Promise<ClockodoCredentials> {
  const [config, credentials] = await Promise.all([
    loadConfigFile(),
    loadCredentialsFile(),
  ])

  return resolveClockodoCredentials({
    config,
    credentials,
    profileFlag,
  })
}

function resolveConfigPaths(environment: NodeJS.ProcessEnv): {
  configPath: string
  credentialsPath: string
} {
  const { configFilePath, credentialsFilePath } = getConfigPaths(environment)

  return {
    configPath: configFilePath,
    credentialsPath: credentialsFilePath,
  }
}

export async function getClockodoAuthContext(
  profileFlag?: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<ClockodoAuthContext> {
  const [config, credentials] = await Promise.all([
    loadConfigFile(environment),
    loadCredentialsFile(environment),
  ])
  const resolvedCredentials = resolveClockodoCredentials({
    config,
    credentials,
    environment,
    profileFlag,
  })
  const { policy, profile } = await getProfilePolicy(profileFlag ?? resolvedCredentials.profile, environment)

  return {
    credentials: resolvedCredentials,
    profile,
    requestPolicy: policy,
  }
}

async function validateCredentials(
  credentials: ClockodoCredentials,
  debug?: boolean,
): Promise<CurrentUser> {
  const client = createClockodoClient(credentials, {
    debug,
    maxRetries: 0,
  })

  return new MeService(client).getCurrentUser()
}

function normalizeRequiredValue(
  value: string | undefined,
  fieldName: string,
): string {
  const normalizedValue = normalizeValue(value)

  if (!normalizedValue) {
    throw new ConfigurationError(`Clockodo ${fieldName} is required.`)
  }

  return normalizedValue
}

export async function login(
  options: AuthLoginOptions,
  environment: NodeJS.ProcessEnv = process.env,
  dependencies: AuthDependencies = {},
): Promise<AuthLoginResult> {
  const profile = await resolveActiveProfile(options.profile, environment)
  const credentials: ClockodoCredentials = {
    apiKey: normalizeRequiredValue(options.apiKey, 'API key'),
    apiUser: normalizeRequiredValue(options.apiUser, 'API user'),
    appEmail: normalizeRequiredValue(options.appEmail, 'app email'),
    appName: normalizeRequiredValue(options.appName, 'app name'),
    baseUrl: normalizeValue(options.baseUrl) ?? DEFAULT_BASE_URL,
    locale: normalizeValue(options.locale),
    profile,
  }
  const validator = dependencies.validateCredentials ?? validateCredentials
  const currentUser = await validator(credentials, options.debug)

  await ensureProfile(profile, environment)
  await saveProfileCredentials(
    profile,
    {
      apiKey: credentials.apiKey,
      apiUser: credentials.apiUser,
      appEmail: credentials.appEmail,
      appName: credentials.appName,
    },
    environment,
  )
  await saveProfileSettings(
    profile,
    {
      baseUrl:
        credentials.baseUrl === DEFAULT_BASE_URL ? undefined : credentials.baseUrl,
      locale: credentials.locale,
    },
    environment,
  )

  let setAsDefault = false

  if (options.setDefault) {
    await setDefaultProfile(profile, environment)
    setAsDefault = true
  }

  return {
    api_user: credentials.apiUser,
    app_email: credentials.appEmail,
    app_name: credentials.appName,
    base_url: credentials.baseUrl,
    current_user: currentUser,
    locale: credentials.locale ?? null,
    profile,
    set_as_default: setAsDefault,
  }
}

export async function logout(
  profileFlag?: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<LogoutResult> {
  const profile = await resolveActiveProfile(profileFlag, environment)

  return {
    profile,
    removed: await removeProfileCredentials(profile, environment),
  }
}
