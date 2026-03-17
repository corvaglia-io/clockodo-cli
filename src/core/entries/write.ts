import { ValidationError } from '../errors/errors.js'

export const CREATE_ENTRY_BILLABLE_VALUES = [0, 1] as const
export const UPDATE_ENTRY_BILLABLE_VALUES = [0, 1, 2, 12] as const

export function validateBillableFlag(
  value: number | undefined,
  allowedValues: readonly number[],
): number | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `--billable must be one of: ${allowedValues.join(', ')}.`,
    )
  }

  return value
}
