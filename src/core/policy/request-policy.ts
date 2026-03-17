import { z } from 'zod'

import { ConfigurationError, ValidationError } from '../errors/errors.js'

export const WriteHttpMethodSchema = z.enum(['DELETE', 'PATCH', 'POST', 'PUT'])
export const RequestPolicyModeSchema = z.enum([
  'allow-listed-writes',
  'full-access',
  'read-only',
])
export const WriteAllowRuleSchema = z.object({
  method: WriteHttpMethodSchema,
  path: z.string().min(1),
})
export const ProfileRequestPolicySchema = z.object({
  allowRawWrites: z.boolean().default(false),
  mode: RequestPolicyModeSchema.default('read-only'),
  writeAllowlist: z.array(WriteAllowRuleSchema).default([]),
})

export type WriteHttpMethod = z.infer<typeof WriteHttpMethodSchema>
export type RequestPolicyMode = z.infer<typeof RequestPolicyModeSchema>
export type WriteAllowRule = z.infer<typeof WriteAllowRuleSchema>
export type ProfileRequestPolicy = z.infer<typeof ProfileRequestPolicySchema>

export interface RequestPolicyEnforcementOptions {
  readonly method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT'
  readonly path: string
  readonly profile: string
  readonly source: 'raw' | 'standard'
}

function isWriteMethod(
  method: RequestPolicyEnforcementOptions['method'],
  path: string,
): boolean {
  if (method === 'POST' && path.endsWith('/search')) {
    return false
  }

  return method !== 'GET'
}

function buildViolationMessage(
  policy: ProfileRequestPolicy,
  options: RequestPolicyEnforcementOptions,
  reason: 'not_allowlisted' | 'raw_writes_disabled' | 'read_only',
): string {
  const baseMessage = `CLI policy blocked ${options.method} ${options.path} for profile '${options.profile}'.`

  if (reason === 'raw_writes_disabled') {
    return `${baseMessage} Raw write requests are disabled for this profile.`
  }

  if (reason === 'not_allowlisted') {
    return `${baseMessage} The request is not present in the local write allowlist for mode '${policy.mode}'.`
  }

  return `${baseMessage} Write access is disabled for mode '${policy.mode}'.`
}

function buildViolationDetails(
  policy: ProfileRequestPolicy,
  options: RequestPolicyEnforcementOptions,
  reason: 'not_allowlisted' | 'raw_writes_disabled' | 'read_only',
): Record<string, unknown> {
  return {
    allow_raw_writes: policy.allowRawWrites,
    local_guardrail_only: true,
    method: options.method,
    path: options.path,
    policy_mode: policy.mode,
    profile: options.profile,
    reason,
    request_source: options.source,
    write_allowlist: policy.writeAllowlist,
  }
}

export function createDefaultProfileRequestPolicy(): ProfileRequestPolicy {
  return ProfileRequestPolicySchema.parse({})
}

export function normalizeWriteHttpMethod(method: string): WriteHttpMethod {
  try {
    return WriteHttpMethodSchema.parse(method.trim().toUpperCase())
  } catch {
    throw new ValidationError(
      'Write rule method must be one of POST, PUT, PATCH, or DELETE.',
    )
  }
}

export function assertValidPathPattern(pathPattern: string): string {
  const trimmedPattern = pathPattern.trim()

  if (!trimmedPattern) {
    throw new ValidationError('Write rule path pattern is required.')
  }

  try {
    new RegExp(trimmedPattern)
  } catch {
    throw new ValidationError(
      `Write rule path pattern '${trimmedPattern}' is not a valid regular expression.`,
    )
  }

  return trimmedPattern
}

export function normalizeWriteAllowRule(
  method: string,
  pathPattern: string,
): WriteAllowRule {
  return {
    method: normalizeWriteHttpMethod(method),
    path: assertValidPathPattern(pathPattern),
  }
}

function matchesWriteAllowRule(
  rule: WriteAllowRule,
  options: RequestPolicyEnforcementOptions,
): boolean {
  if (rule.method !== options.method) {
    return false
  }

  try {
    return new RegExp(rule.path).test(options.path)
  } catch {
    throw new ConfigurationError(
      `Write rule path pattern '${rule.path}' is not a valid regular expression.`,
      {
        details: {
          path_pattern: rule.path,
          profile: options.profile,
        },
      },
    )
  }
}

export function assertRequestAllowed(
  policy: ProfileRequestPolicy,
  options: RequestPolicyEnforcementOptions,
): void {
  if (!isWriteMethod(options.method, options.path)) {
    return
  }

  if (policy.mode === 'full-access') {
    return
  }

  if (options.source === 'raw' && !policy.allowRawWrites) {
    throw new ConfigurationError(
      buildViolationMessage(policy, options, 'raw_writes_disabled'),
      {
        details: buildViolationDetails(policy, options, 'raw_writes_disabled'),
      },
    )
  }

  if (policy.mode === 'read-only') {
    throw new ConfigurationError(
      buildViolationMessage(policy, options, 'read_only'),
      {
        details: buildViolationDetails(policy, options, 'read_only'),
      },
    )
  }

  if (
    policy.writeAllowlist.some((rule) => matchesWriteAllowRule(rule, options))
  ) {
    return
  }

  throw new ConfigurationError(
    buildViolationMessage(policy, options, 'not_allowlisted'),
    {
      details: buildViolationDetails(policy, options, 'not_allowlisted'),
    },
  )
}
