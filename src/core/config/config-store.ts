import { constants } from 'node:fs'
import {
  access,
  chmod,
  mkdir,
  readFile,
  unlink,
  writeFile,
} from 'node:fs/promises'

import { z } from 'zod'

import { ConfigurationError } from '../errors/errors.js'
import { getConfigPaths } from './paths.js'
import type {
  ConfigFile,
  CredentialsFile,
} from './types.js'
import {
  ProfileRequestPolicySchema,
  createDefaultProfileRequestPolicy,
} from '../policy/request-policy.js'

const ProfileConfigSchema = z.object({
  baseUrl: z.string().optional(),
  locale: z.string().optional(),
  policy: ProfileRequestPolicySchema.default(createDefaultProfileRequestPolicy()),
})

const ConfigFileSchema = z.object({
  defaultProfile: z.string().optional(),
  profiles: z.record(ProfileConfigSchema).default({}),
})

const StoredCredentialsSchema = z.object({
  apiUser: z.string().min(1),
  apiKey: z.string().min(1),
  appName: z.string().min(1),
  appEmail: z.string().email(),
  updatedAt: z.string().datetime().optional(),
})

const CredentialsFileSchema = z.object({
  profiles: z.record(StoredCredentialsSchema).default({}),
})

async function readJsonFile(filePath: string): Promise<unknown | undefined> {
  try {
    const fileContents = await readFile(filePath, 'utf8')
    return JSON.parse(fileContents) as unknown
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }

    throw new ConfigurationError(`Unable to read configuration file: ${filePath}`, {
      cause: error,
    })
  }
}

export async function ensureConfigDirectory(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const { configDir } = getConfigPaths(environment)

  await mkdir(configDir, {
    recursive: true,
    mode: 0o700,
  })

  return configDir
}

async function writeJsonFile(
  filePath: string,
  contents: unknown,
): Promise<void> {
  const serializedConfig = `${JSON.stringify(contents, null, 2)}\n`

  await writeFile(filePath, serializedConfig, {
    encoding: 'utf8',
    mode: 0o600,
  })
  await chmod(filePath, 0o600)
}

export async function loadConfigFile(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<ConfigFile> {
  const { configFilePath } = getConfigPaths(environment)
  const rawConfig = await readJsonFile(configFilePath)

  if (!rawConfig) {
    return {
      profiles: {},
    }
  }

  const parsedConfig = ConfigFileSchema.safeParse(rawConfig)

  if (!parsedConfig.success) {
    throw new ConfigurationError(`Invalid config file: ${configFilePath}`, {
      details: parsedConfig.error.flatten(),
    })
  }

  return parsedConfig.data
}

export async function saveConfigFile(
  config: ConfigFile,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const { configFilePath } = getConfigPaths(environment)

  await ensureConfigDirectory(environment)
  await writeJsonFile(configFilePath, ConfigFileSchema.parse(config))
}

export async function loadCredentialsFile(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<CredentialsFile> {
  const { credentialsFilePath } = getConfigPaths(environment)
  const rawCredentials = await readJsonFile(credentialsFilePath)

  if (!rawCredentials) {
    return {
      profiles: {},
    }
  }

  const parsedCredentials = CredentialsFileSchema.safeParse(rawCredentials)

  if (!parsedCredentials.success) {
    throw new ConfigurationError(`Invalid credentials file: ${credentialsFilePath}`, {
      details: parsedCredentials.error.flatten(),
    })
  }

  return parsedCredentials.data
}

export async function saveCredentialsFile(
  credentials: CredentialsFile,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const { credentialsFilePath } = getConfigPaths(environment)

  await ensureConfigDirectory(environment)
  await writeJsonFile(credentialsFilePath, CredentialsFileSchema.parse(credentials))
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function removeCredentialsProfile(
  profileName: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  const currentCredentials = await loadCredentialsFile(environment)

  if (!currentCredentials.profiles[profileName]) {
    return false
  }

  const nextProfiles = { ...currentCredentials.profiles }
  delete nextProfiles[profileName]

  const { credentialsFilePath } = getConfigPaths(environment)

  if (Object.keys(nextProfiles).length === 0) {
    if (await pathExists(credentialsFilePath)) {
      await unlink(credentialsFilePath)
    }

    return true
  }

  await saveCredentialsFile(
    {
      profiles: nextProfiles,
    },
    environment,
  )

  return true
}
