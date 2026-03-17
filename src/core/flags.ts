import { Flags } from '@oclif/core'

export const sharedFlags = {
  debug: Flags.boolean({
    description: 'Enable debug output',
    env: 'CLOCKODO_DEBUG',
  }),
  json: Flags.boolean({
    description: 'Output as JSON',
  }),
  profile: Flags.string({
    description: 'Use a specific Clockodo profile',
    env: 'CLOCKODO_PROFILE',
  }),
}

export const confirmationFlags = {
  'no-interactive': Flags.boolean({
    description: 'Disable prompts and fail instead of waiting for confirmation',
  }),
  yes: Flags.boolean({
    description: 'Bypass confirmation prompts',
  }),
}
