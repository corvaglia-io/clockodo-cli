import type { ProfileRequestPolicy } from '../config/types.js'

export const POLICY_PRESET_NAMES = [
  'billing-write',
  'full-access',
  'read-only',
  'timesheet-write',
] as const

export type RequestPolicyPresetName = typeof POLICY_PRESET_NAMES[number]

export interface RequestPolicyPresetDefinition {
  readonly description: string
  readonly name: RequestPolicyPresetName
  readonly policy: ProfileRequestPolicy
}

const POLICY_PRESETS: Record<
  RequestPolicyPresetName,
  RequestPolicyPresetDefinition
> = {
  'billing-write': {
    description:
      'Allow billing state mutations only: entrygroups mark-billed and project mark-billed.',
    name: 'billing-write',
    policy: {
      allowRawWrites: false,
      mode: 'allow-listed-writes',
      writeAllowlist: [
        {
          method: 'PUT',
          path: '^/v2/entrygroups$',
        },
        {
          method: 'PUT',
          path: '^/v3/projects/[0-9]+/setBilled$',
        },
      ],
    },
  },
  'full-access': {
    description: 'Allow all write requests for the selected profile.',
    name: 'full-access',
    policy: {
      allowRawWrites: false,
      mode: 'full-access',
      writeAllowlist: [],
    },
  },
  'read-only': {
    description: 'Block all write requests. Safe default for live accounts.',
    name: 'read-only',
    policy: {
      allowRawWrites: false,
      mode: 'read-only',
      writeAllowlist: [],
    },
  },
  'timesheet-write': {
    description:
      'Allow stopwatch and entry mutations without opening broader billing writes.',
    name: 'timesheet-write',
    policy: {
      allowRawWrites: false,
      mode: 'allow-listed-writes',
      writeAllowlist: [
        {
          method: 'POST',
          path: '^/v2/clock$',
        },
        {
          method: 'DELETE',
          path: '^/v2/clock/[0-9]+$',
        },
        {
          method: 'POST',
          path: '^/v2/entries$',
        },
        {
          method: 'PUT',
          path: '^/v2/entries/[0-9]+$',
        },
        {
          method: 'DELETE',
          path: '^/v2/entries/[0-9]+$',
        },
      ],
    },
  },
}

function clonePolicy(policy: ProfileRequestPolicy): ProfileRequestPolicy {
  return {
    allowRawWrites: policy.allowRawWrites,
    mode: policy.mode,
    writeAllowlist: policy.writeAllowlist.map((rule) => ({ ...rule })),
  }
}

export function getPolicyPreset(
  presetName: RequestPolicyPresetName,
): RequestPolicyPresetDefinition {
  const preset = POLICY_PRESETS[presetName]

  return {
    ...preset,
    policy: clonePolicy(preset.policy),
  }
}

export function listPolicyPresets(): readonly RequestPolicyPresetDefinition[] {
  return POLICY_PRESET_NAMES.map((presetName) => getPolicyPreset(presetName))
}
