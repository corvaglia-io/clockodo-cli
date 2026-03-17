import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  applyPolicyPreset,
  addProfileWriteAllowRule,
  getEffectiveConfig,
  removeProfileCredentials,
  saveProfileCredentials,
  saveProfileSettings,
  setDefaultProfile,
  setProfilePolicyMode,
} from '../../../../src/core/config/config-manager.js'

describe('config-manager', () => {
  it('persists effective config, policy, and credentials for a profile', async () => {
    const tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'clockodo-cli-config-'),
    )
    const environment = {
      HOME: tempDirectory,
      XDG_CONFIG_HOME: tempDirectory,
    }

    try {
      await saveProfileSettings(
        'work',
        {
          baseUrl: 'https://example.invalid/api',
          locale: 'de',
        },
        environment,
      )
      await saveProfileCredentials(
        'work',
        {
          apiKey: 'secret-key',
          apiUser: 'jane@example.com',
          appEmail: 'dev@example.com',
          appName: 'Clockodo CLI',
        },
        environment,
      )
      await setProfilePolicyMode('work', 'allow-listed-writes', environment)
      await addProfileWriteAllowRule('work', 'POST', '^/v2/entries$', environment)
      await setDefaultProfile('work', environment)

      const result = await getEffectiveConfig(environment)

      expect(result).toMatchObject({
        activeProfile: 'work',
        configDir: path.join(tempDirectory, 'clockodo-cli'),
        defaultProfile: 'work',
        hasConfigFile: true,
        hasCredentialsFile: true,
        profiles: ['work'],
      })
      expect(result.activePolicy.mode).toBe('allow-listed-writes')
      expect(result.activePolicy.writeAllowlist).toEqual([
        {
          method: 'POST',
          path: '^/v2/entries$',
        },
      ])
    } finally {
      await rm(tempDirectory, { force: true, recursive: true })
    }
  })

  it('removes the credentials file when the last stored profile is deleted', async () => {
    const tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'clockodo-cli-config-'),
    )
    const environment = {
      HOME: tempDirectory,
      XDG_CONFIG_HOME: tempDirectory,
    }

    try {
      await saveProfileCredentials(
        'work',
        {
          apiKey: 'secret-key',
          apiUser: 'jane@example.com',
          appEmail: 'dev@example.com',
          appName: 'Clockodo CLI',
        },
        environment,
      )

      await expect(removeProfileCredentials('work', environment)).resolves.toBe(true)

      const result = await getEffectiveConfig(environment)

      expect(result.hasCredentialsFile).toBe(false)
    } finally {
      await rm(tempDirectory, { force: true, recursive: true })
    }
  })

  it('applies policy presets to a profile', async () => {
    const tempDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'clockodo-cli-config-'),
    )
    const environment = {
      HOME: tempDirectory,
      XDG_CONFIG_HOME: tempDirectory,
    }

    try {
      const result = await applyPolicyPreset(
        'work',
        'timesheet-write',
        environment,
      )

      expect(result.preset).toBe('timesheet-write')
      expect(result.policy.mode).toBe('allow-listed-writes')
      expect(result.policy.writeAllowlist).toEqual([
        { method: 'POST', path: '^/v2/clock$' },
        { method: 'DELETE', path: '^/v2/clock/[0-9]+$' },
        { method: 'POST', path: '^/v2/entries$' },
        { method: 'PUT', path: '^/v2/entries/[0-9]+$' },
        { method: 'DELETE', path: '^/v2/entries/[0-9]+$' },
      ])
    } finally {
      await rm(tempDirectory, { force: true, recursive: true })
    }
  })
})
