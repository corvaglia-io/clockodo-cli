import process from 'node:process'
import { createInterface } from 'node:readline/promises'

import { ValidationError } from './errors/errors.js'

interface ConfirmDestructiveActionOptions {
  readonly cancelledMessage?: string
  readonly noInteractive?: boolean
  readonly prompt: string
  readonly requiredMessage?: string
  readonly yes?: boolean
}

export async function confirmDestructiveAction(
  options: ConfirmDestructiveActionOptions,
): Promise<void> {
  if (options.yes) {
    return
  }

  if (
    options.noInteractive ||
    !process.stdin.isTTY ||
    !process.stdout.isTTY
  ) {
    throw new ValidationError(
      options.requiredMessage ??
        'Confirmation required. Re-run with --yes or use an interactive terminal.',
    )
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const answer = await readline.question(`${options.prompt} [y/N] `)
    const normalizedAnswer = answer.trim().toLowerCase()

    if (normalizedAnswer !== 'y' && normalizedAnswer !== 'yes') {
      throw new ValidationError(options.cancelledMessage ?? 'Action cancelled.')
    }
  } finally {
    readline.close()
  }
}
