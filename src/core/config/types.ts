export type WriteHttpMethod = 'DELETE' | 'PATCH' | 'POST' | 'PUT'
export type RequestPolicyMode =
  | 'allow-listed-writes'
  | 'full-access'
  | 'read-only'

export interface WriteAllowRule {
  method: WriteHttpMethod
  path: string
}

export interface ProfileRequestPolicy {
  allowRawWrites: boolean
  mode: RequestPolicyMode
  writeAllowlist: WriteAllowRule[]
}

export interface ProfileConfig {
  readonly baseUrl?: string
  readonly locale?: string
  readonly policy?: ProfileRequestPolicy
}

export interface ConfigFile {
  readonly defaultProfile?: string
  readonly profiles: Readonly<Record<string, ProfileConfig>>
}

export interface StoredCredentials {
  readonly apiUser: string
  readonly apiKey: string
  readonly appName: string
  readonly appEmail: string
  readonly updatedAt?: string
}

export interface CredentialsFile {
  readonly profiles: Readonly<Record<string, StoredCredentials>>
}

export interface ClockodoCredentials extends StoredCredentials {
  readonly baseUrl: string
  readonly locale?: string
  readonly profile?: string
}

export interface EffectiveConfig {
  activePolicy: ProfileRequestPolicy
  activeProfile: string
  configDir: string
  configFilePath: string
  credentialsFilePath: string
  debugEnabled: boolean
  defaultProfile: string | null
  hasConfigFile: boolean
  hasCredentialsFile: boolean
  profiles: string[]
}

export interface ProfileSettingsInput {
  readonly baseUrl?: string
  readonly locale?: string
}
