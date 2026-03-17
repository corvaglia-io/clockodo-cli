import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  getClockodoAuthContext,
  login,
  logout,
  resolveClockodoAuthStatus,
  resolveClockodoCredentials,
} from '../../../../src/core/auth/auth-manager.js'
import {
  loadConfigFile,
  loadCredentialsFile,
} from '../../../../src/core/config/config-store.js'
import type {
  ConfigFile,
  CredentialsFile,
} from '../../../../src/core/config/types.js'
import { ConfigurationError } from '../../../../src/core/errors/errors.js'

const emptyConfig: ConfigFile = {
  profiles: {},
}

const emptyCredentials: CredentialsFile = {
  profiles: {},
}

describe('resolveClockodoCredentials', () => {
  it('resolves credentials from environment variables', () => {
    const credentials = resolveClockodoCredentials({
      config: emptyConfig,
      credentials: emptyCredentials,
      environment: {
        CLOCKODO_API_KEY: 'secret-key',
        CLOCKODO_API_USER: 'jane@example.com',
        CLOCKODO_APP_EMAIL: 'dev@example.com',
        CLOCKODO_APP_NAME: 'Clockodo CLI',
        CLOCKODO_BASE_URL: 'https://example.invalid/api',
        CLOCKODO_LOCALE: 'en',
      },
    })

    expect(credentials).toEqual({
      apiKey: 'secret-key',
      apiUser: 'jane@example.com',
      appEmail: 'dev@example.com',
      appName: 'Clockodo CLI',
      baseUrl: 'https://example.invalid/api',
      locale: 'en',
      profile: 'default',
    })
  })

  it('merges profile credentials with environment overrides', () => {
    const credentials = resolveClockodoCredentials({
      config: {
        defaultProfile: 'work',
        profiles: {
          work: {
            baseUrl: 'https://my.clockodo.com/api',
            locale: 'de',
          },
        },
      },
      credentials: {
        profiles: {
          work: {
            apiKey: 'stored-secret',
            apiUser: 'joe@example.com',
            appEmail: 'ops@example.com',
            appName: 'Stored App',
          },
        },
      },
      environment: {
        CLOCKODO_APP_NAME: 'Override App',
      },
    })

    expect(credentials).toEqual({
      apiKey: 'stored-secret',
      apiUser: 'joe@example.com',
      appEmail: 'ops@example.com',
      appName: 'Override App',
      baseUrl: 'https://my.clockodo.com/api',
      locale: 'de',
      profile: 'work',
    })
  })

  it('throws when no credentials can be resolved', () => {
    expect(() =>
      resolveClockodoCredentials({
        config: emptyConfig,
        credentials: emptyCredentials,
        environment: {},
      }),
    ).toThrow(ConfigurationError)
  })
})

describe('resolveClockodoAuthStatus', () => {
  it('reports sources and paths for environment-based auth', () => {
    const status = resolveClockodoAuthStatus({
      config: emptyConfig,
      credentials: emptyCredentials,
      environment: {
        CLOCKODO_API_KEY: 'secret-key',
        CLOCKODO_API_USER: 'jane@example.com',
        CLOCKODO_APP_EMAIL: 'dev@example.com',
        CLOCKODO_APP_NAME: 'Clockodo CLI',
        HOME: '/tmp/test-home',
      },
    })

    expect(status).toEqual({
      api_key_present: true,
      api_key_source: 'env',
      api_user: 'jane@example.com',
      api_user_source: 'env',
      app_email: 'dev@example.com',
      app_email_source: 'env',
      app_name: 'Clockodo CLI',
      app_name_source: 'env',
      base_url: 'https://my.clockodo.com/api',
      base_url_source: 'default',
      config_path: '/tmp/test-home/.config/clockodo-cli/config.json',
      configured: true,
      credentials_path: '/tmp/test-home/.config/clockodo-cli/credentials.json',
      locale: null,
      locale_source: 'missing',
      missing_fields: [],
      policy_allow_raw_writes: false,
      policy_mode: 'read-only',
      policy_write_allowlist_count: 0,
      profile: 'default',
      profile_source: 'default',
      stored_credentials_updated_at: null,
    })
  })

  it('reports missing fields for incomplete profile configuration', () => {
    const status = resolveClockodoAuthStatus({
      config: {
        defaultProfile: 'work',
        profiles: {
          work: {
            locale: 'de',
          },
        },
      },
      credentials: {
        profiles: {
          work: {
            apiKey: 'stored-secret',
            apiUser: 'joe@example.com',
            appEmail: 'ops@example.com',
            appName: '',
          },
        },
      },
      environment: {
        HOME: '/tmp/test-home',
      },
    })

    expect(status.configured).toBe(false)
    expect(status.profile).toBe('work')
    expect(status.profile_source).toBe('config')
    expect(status.missing_fields).toEqual(['app_name'])
    expect(status.api_key_source).toBe('profile')
    expect(status.locale).toBe('de')
    expect(status.locale_source).toBe('profile')
    expect(status.policy_mode).toBe('read-only')
    expect(status.policy_write_allowlist_count).toBe(0)
  })
})

describe('profile-backed auth', () => {
  it('validates and stores credentials for a profile', async () => {
    const tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'clockodo-cli-auth-'),
    )
    const environment = {
      HOME: tempDirectory,
      XDG_CONFIG_HOME: tempDirectory,
    }

    try {
      const result = await login(
        {
          apiKey: 'secret-key',
          apiUser: 'jane@example.com',
          appEmail: 'dev@example.com',
          appName: 'Clockodo CLI',
          locale: 'de',
          profile: 'work',
          setDefault: true,
        },
        environment,
        {
          validateCredentials: async () => ({
            email: 'jane@example.com',
            id: 42,
            name: 'Jane Doe',
            role: 'owner',
          }),
        },
      )

      expect(result.profile).toBe('work')
      expect(result.set_as_default).toBe(true)
      expect(result.current_user.id).toBe(42)

      const [config, credentials, authContext] = await Promise.all([
        loadConfigFile(environment),
        loadCredentialsFile(environment),
        getClockodoAuthContext('work', environment),
      ])

      expect(config.defaultProfile).toBe('work')
      expect(config.profiles.work?.locale).toBe('de')
      expect(credentials.profiles.work).toMatchObject({
        apiKey: 'secret-key',
        apiUser: 'jane@example.com',
        appEmail: 'dev@example.com',
        appName: 'Clockodo CLI',
      })
      expect(credentials.profiles.work?.updatedAt).toEqual(expect.any(String))
      expect(authContext.profile).toBe('work')
      expect(authContext.requestPolicy.mode).toBe('read-only')
    } finally {
      await rm(tempDirectory, { force: true, recursive: true })
    }
  })

  it('removes stored credentials during logout', async () => {
    const tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'clockodo-cli-auth-'),
    )
    const environment = {
      HOME: tempDirectory,
      XDG_CONFIG_HOME: tempDirectory,
    }

    try {
      await login(
        {
          apiKey: 'secret-key',
          apiUser: 'jane@example.com',
          appEmail: 'dev@example.com',
          appName: 'Clockodo CLI',
          profile: 'work',
        },
        environment,
        {
          validateCredentials: async () => ({
            email: 'jane@example.com',
            id: 42,
            name: 'Jane Doe',
          }),
        },
      )

      await expect(logout('work', environment)).resolves.toEqual({
        profile: 'work',
        removed: true,
      })

      await expect(loadCredentialsFile(environment)).resolves.toEqual({
        profiles: {},
      })
    } finally {
      await rm(tempDirectory, { force: true, recursive: true })
    }
  })
})
