import { describe, expect, it } from 'vitest'

import {
  assertRequestAllowed,
  createDefaultProfileRequestPolicy,
  normalizeWriteAllowRule,
} from '../../../../src/core/policy/request-policy.js'

describe('request-policy', () => {
  it('allows read-only GET requests', () => {
    expect(() =>
      assertRequestAllowed(createDefaultProfileRequestPolicy(), {
        method: 'GET',
        path: '/v2/entries',
        profile: 'default',
        source: 'standard',
      }),
    ).not.toThrow()
  })

  it('blocks write requests in read-only mode', () => {
    expect(() =>
      assertRequestAllowed(createDefaultProfileRequestPolicy(), {
        method: 'POST',
        path: '/v2/entries',
        profile: 'default',
        source: 'standard',
      }),
    ).toThrow(/Write access is disabled/)
  })

  it('allows writes that match the local allowlist', () => {
    const policy = createDefaultProfileRequestPolicy()
    policy.mode = 'allow-listed-writes'
    policy.writeAllowlist = [normalizeWriteAllowRule('POST', '^/v2/entries$')]

    expect(() =>
      assertRequestAllowed(policy, {
        method: 'POST',
        path: '/v2/entries',
        profile: 'default',
        source: 'standard',
      }),
    ).not.toThrow()
  })

  it('treats POST search endpoints as read-only queries', () => {
    expect(() =>
      assertRequestAllowed(createDefaultProfileRequestPolicy(), {
        method: 'POST',
        path: '/v2/entries/search',
        profile: 'default',
        source: 'standard',
      }),
    ).not.toThrow()
  })
})
