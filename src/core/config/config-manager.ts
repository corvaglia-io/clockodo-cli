import { constants } from 'node:fs'
import { access } from 'node:fs/promises'

import type {
  ConfigFile,
  EffectiveConfig,
  ProfileConfig,
  ProfileSettingsInput,
  StoredCredentials,
} from './types.js'
import {
  loadConfigFile,
  loadCredentialsFile,
  removeCredentialsProfile,
  saveConfigFile,
  saveCredentialsFile,
} from './config-store.js'
import { getConfigPaths } from './paths.js'
import { ValidationError } from '../errors/errors.js'
import {
  createDefaultProfileRequestPolicy,
  normalizeWriteAllowRule,
  type ProfileRequestPolicy,
  type RequestPolicyMode,
  type WriteAllowRule,
} from '../policy/request-policy.js'
import {
  getPolicyPreset,
  type RequestPolicyPresetName,
} from '../policy/presets.js'

const DEFAULT_PROFILE = 'default'
type ResolvedProfileConfig = ProfileConfig & { policy: ProfileRequestPolicy }

function normalizeOptionalValue(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined
  }

  const trimmedValue = value.trim()

  return trimmedValue === '' ? undefined : trimmedValue
}

function createProfileConfig(
  existing: ProfileConfig | undefined = undefined,
): ResolvedProfileConfig {
  return {
    baseUrl: existing?.baseUrl,
    locale: existing?.locale,
    policy: existing?.policy ?? createDefaultProfileRequestPolicy(),
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function getProfileConfig(
  config: ConfigFile,
  profileName: string,
): ResolvedProfileConfig {
  return createProfileConfig(config.profiles[profileName])
}

function getFirstProfileName(
  config: ConfigFile,
  credentials: Awaited<ReturnType<typeof loadCredentialsFile>>,
): string | undefined {
  return Object.keys(credentials.profiles)[0] ?? Object.keys(config.profiles)[0]
}

export function normalizeProfileName(profileName: string): string {
  const trimmedProfileName = profileName.trim()

  if (!trimmedProfileName) {
    throw new ValidationError('Profile name is required.')
  }

  return trimmedProfileName
}

export async function resolveActiveProfile(
  profileName: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const normalizedFlagProfile = normalizeOptionalValue(profileName)

  if (normalizedFlagProfile) {
    return normalizeProfileName(normalizedFlagProfile)
  }

  const normalizedEnvironmentProfile = normalizeOptionalValue(env.CLOCKODO_PROFILE)

  if (normalizedEnvironmentProfile) {
    return normalizeProfileName(normalizedEnvironmentProfile)
  }

  const [config, credentials] = await Promise.all([
    loadConfigFile(env),
    loadCredentialsFile(env),
  ])

  const normalizedDefaultProfile = normalizeOptionalValue(config.defaultProfile)

  if (normalizedDefaultProfile) {
    return normalizeProfileName(normalizedDefaultProfile)
  }

  return getFirstProfileName(config, credentials) ?? DEFAULT_PROFILE
}

export async function ensureProfile(
  profileName: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ConfigFile> {
  const normalizedProfileName = normalizeProfileName(profileName)
  const currentConfig = await loadConfigFile(env)

  if (currentConfig.profiles[normalizedProfileName]) {
    return currentConfig
  }

  const nextConfig: ConfigFile = {
    ...currentConfig,
    profiles: {
      ...currentConfig.profiles,
      [normalizedProfileName]: createProfileConfig(),
    },
  }

  await saveConfigFile(nextConfig, env)

  return nextConfig
}

export async function setDefaultProfile(
  profileName: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ConfigFile> {
  const normalizedProfileName = normalizeProfileName(profileName)
  const currentConfig = await loadConfigFile(env)
  const nextConfig: ConfigFile = {
    ...currentConfig,
    defaultProfile: normalizedProfileName,
    profiles: {
      ...currentConfig.profiles,
      [normalizedProfileName]:
        currentConfig.profiles[normalizedProfileName] ?? createProfileConfig(),
    },
  }

  await saveConfigFile(nextConfig, env)

  return nextConfig
}

export async function saveProfileSettings(
  profileName: string,
  settings: ProfileSettingsInput,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ConfigFile> {
  const normalizedProfileName = normalizeProfileName(profileName)
  const currentConfig = await loadConfigFile(env)
  const currentProfileConfig = getProfileConfig(currentConfig, normalizedProfileName)
  const nextProfileConfig: ProfileConfig = {
    ...currentProfileConfig,
    ...(settings.baseUrl === undefined ? {} : { baseUrl: settings.baseUrl }),
    ...(settings.locale === undefined ? {} : { locale: settings.locale }),
  }
  const nextConfig: ConfigFile = {
    ...currentConfig,
    profiles: {
      ...currentConfig.profiles,
      [normalizedProfileName]: nextProfileConfig,
    },
  }

  await saveConfigFile(nextConfig, env)

  return nextConfig
}

export async function saveProfileCredentials(
  profileName: string,
  credentials: Omit<StoredCredentials, 'updatedAt'>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<StoredCredentials> {
  const normalizedProfileName = normalizeProfileName(profileName)
  const nextStoredCredentials: StoredCredentials = {
    ...credentials,
    updatedAt: new Date().toISOString(),
  }
  const currentCredentials = await loadCredentialsFile(env)
  const nextCredentials = {
    profiles: {
      ...currentCredentials.profiles,
      [normalizedProfileName]: nextStoredCredentials,
    },
  }

  await saveCredentialsFile(nextCredentials, env)

  return nextStoredCredentials
}

export async function removeProfileCredentials(
  profileName: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const normalizedProfileName = normalizeProfileName(profileName)
  return removeCredentialsProfile(normalizedProfileName, env)
}

export async function getProfilePolicy(
  profileName: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  policy: ProfileRequestPolicy
  profile: string
}> {
  const profile = await resolveActiveProfile(profileName, env)
  const config = await loadConfigFile(env)

  return {
    policy: getProfileConfig(config, profile).policy ?? createDefaultProfileRequestPolicy(),
    profile,
  }
}

export async function setProfilePolicyMode(
  profileName: string | undefined,
  mode: RequestPolicyMode,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  policy: ProfileRequestPolicy
  profile: string
}> {
  const profile = await resolveActiveProfile(profileName, env)
  const currentConfig = await loadConfigFile(env)
  const currentProfileConfig = getProfileConfig(currentConfig, profile)
  const nextProfileConfig: ProfileConfig = {
    ...currentProfileConfig,
    policy: {
      ...currentProfileConfig.policy,
      mode,
    },
  }
  const nextConfig: ConfigFile = {
    ...currentConfig,
    profiles: {
      ...currentConfig.profiles,
      [profile]: nextProfileConfig,
    },
  }

  await saveConfigFile(nextConfig, env)

  return {
    policy: nextProfileConfig.policy!,
    profile,
  }
}

export async function addProfileWriteAllowRule(
  profileName: string | undefined,
  method: string,
  pathPattern: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  policy: ProfileRequestPolicy
  profile: string
  rule: WriteAllowRule
}> {
  const profile = await resolveActiveProfile(profileName, env)
  const rule = normalizeWriteAllowRule(method, pathPattern)
  const currentConfig = await loadConfigFile(env)
  const currentProfileConfig = getProfileConfig(currentConfig, profile)
  const ruleAlreadyExists = currentProfileConfig.policy!.writeAllowlist.some(
    (existingRule) =>
      existingRule.method === rule.method && existingRule.path === rule.path,
  )
  const nextPolicy: ProfileRequestPolicy = {
    ...currentProfileConfig.policy!,
    mode:
      currentProfileConfig.policy!.mode === 'read-only'
        ? 'allow-listed-writes'
        : currentProfileConfig.policy!.mode,
    writeAllowlist: ruleAlreadyExists
      ? currentProfileConfig.policy!.writeAllowlist
      : [...currentProfileConfig.policy!.writeAllowlist, rule],
  }
  const nextConfig: ConfigFile = {
    ...currentConfig,
    profiles: {
      ...currentConfig.profiles,
      [profile]: {
        ...currentProfileConfig,
        policy: nextPolicy,
      },
    },
  }

  await saveConfigFile(nextConfig, env)

  return {
    policy: nextPolicy,
    profile,
    rule,
  }
}

export async function removeProfileWriteAllowRule(
  profileName: string | undefined,
  method: string,
  pathPattern: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  policy: ProfileRequestPolicy
  profile: string
  removed: boolean
  rule: WriteAllowRule
}> {
  const profile = await resolveActiveProfile(profileName, env)
  const rule = normalizeWriteAllowRule(method, pathPattern)
  const currentConfig = await loadConfigFile(env)
  const currentProfileConfig = getProfileConfig(currentConfig, profile)
  const nextWriteAllowlist = currentProfileConfig.policy!.writeAllowlist.filter(
    (existingRule) =>
      existingRule.method !== rule.method || existingRule.path !== rule.path,
  )
  const removed =
    nextWriteAllowlist.length !== currentProfileConfig.policy!.writeAllowlist.length
  const nextPolicy: ProfileRequestPolicy = {
    ...currentProfileConfig.policy!,
    writeAllowlist: nextWriteAllowlist,
  }
  const nextConfig: ConfigFile = {
    ...currentConfig,
    profiles: {
      ...currentConfig.profiles,
      [profile]: {
        ...currentProfileConfig,
        policy: nextPolicy,
      },
    },
  }

  await saveConfigFile(nextConfig, env)

  return {
    policy: nextPolicy,
    profile,
    removed,
    rule,
  }
}

export async function applyPolicyPreset(
  profileName: string | undefined,
  presetName: RequestPolicyPresetName,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{
  policy: ProfileRequestPolicy
  preset: RequestPolicyPresetName
  profile: string
}> {
  const profile = await resolveActiveProfile(profileName, env)
  const currentConfig = await loadConfigFile(env)
  const currentProfileConfig = getProfileConfig(currentConfig, profile)
  const preset = getPolicyPreset(presetName)
  const nextConfig: ConfigFile = {
    ...currentConfig,
    profiles: {
      ...currentConfig.profiles,
      [profile]: {
        ...currentProfileConfig,
        policy: preset.policy,
      },
    },
  }

  await saveConfigFile(nextConfig, env)

  return {
    policy: preset.policy,
    preset: preset.name,
    profile,
  }
}

export async function getEffectiveConfig(
  env: NodeJS.ProcessEnv = process.env,
  profileName?: string,
): Promise<EffectiveConfig> {
  const config = await loadConfigFile(env)
  const activeProfile = await resolveActiveProfile(profileName, env)
  const { configDir, configFilePath, credentialsFilePath } = getConfigPaths(env)

  return {
    activePolicy: getProfileConfig(config, activeProfile).policy!,
    activeProfile,
    configDir,
    configFilePath,
    credentialsFilePath,
    debugEnabled:
      env.CLOCKODO_DEBUG === '1' ||
      env.CLOCKODO_DEBUG?.toLowerCase() === 'true',
    defaultProfile: config.defaultProfile ?? null,
    hasConfigFile: await pathExists(configFilePath),
    hasCredentialsFile: await pathExists(credentialsFilePath),
    profiles: Array.from(
      new Set([
        ...Object.keys(config.profiles),
        ...Object.keys((await loadCredentialsFile(env)).profiles),
      ]),
    ).sort(),
  }
}
