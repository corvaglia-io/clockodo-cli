import { describe, expect, it } from 'vitest'

import {
  POLICY_PRESET_NAMES,
  getPolicyPreset,
  listPolicyPresets,
} from '../../../../src/core/policy/presets.js'

describe('policy presets', () => {
  it('lists the supported preset names in a stable order', () => {
    expect(POLICY_PRESET_NAMES).toEqual([
      'billing-write',
      'full-access',
      'read-only',
      'timesheet-write',
    ])
  })

  it('returns cloned policy objects for presets', () => {
    const preset = getPolicyPreset('timesheet-write')

    expect(preset.policy.mode).toBe('allow-listed-writes')
    expect(preset.policy.writeAllowlist).toEqual([
      { method: 'POST', path: '^/v2/clock$' },
      { method: 'DELETE', path: '^/v2/clock/[0-9]+$' },
      { method: 'POST', path: '^/v2/entries$' },
      { method: 'PUT', path: '^/v2/entries/[0-9]+$' },
      { method: 'DELETE', path: '^/v2/entries/[0-9]+$' },
    ])

    preset.policy.writeAllowlist.push({ method: 'PUT', path: '^/v2/clock$' })

    expect(getPolicyPreset('timesheet-write').policy.writeAllowlist).toHaveLength(5)
  })

  it('lists preset metadata for discovery', () => {
    expect(listPolicyPresets()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          description: expect.any(String),
          name: 'read-only',
        }),
      ]),
    )
  })
})
