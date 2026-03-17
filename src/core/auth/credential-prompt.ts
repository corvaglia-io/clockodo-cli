import readline from 'node:readline/promises'

import { ValidationError } from '../errors/errors.js'

const BRACKETED_PASTE_START = '\u001b[200~'
const BRACKETED_PASTE_END = '\u001b[201~'

interface SecretPromptParserState {
  pendingEscape: string
}

function createSecretPromptParserState(): SecretPromptParserState {
  return {
    pendingEscape: '',
  }
}

function isPrintableInput(chunk: string): boolean {
  return chunk.length === 1 && chunk >= ' ' && chunk !== '\u007f'
}

function isCsiParameterCharacter(character: string | undefined): boolean {
  return (
    character !== undefined &&
    ((character >= '0' && character <= '9') ||
      character === ';' ||
      character === '?')
  )
}

function extractCsiControlSequence(input: string): string | null {
  if (!input.startsWith('\u001b[')) {
    return null
  }

  let index = 2

  while (isCsiParameterCharacter(input[index])) {
    index += 1
  }

  const terminator = input[index]

  if (
    terminator !== undefined &&
    ((terminator >= 'A' && terminator <= 'Z') ||
      (terminator >= 'a' && terminator <= 'z') ||
      terminator === '~')
  ) {
    return input.slice(0, index + 1)
  }

  return null
}

function isIncompleteCsiControlSequence(input: string): boolean {
  if (!input.startsWith('\u001b[')) {
    return false
  }

  for (let index = 2; index < input.length; index += 1) {
    if (!isCsiParameterCharacter(input[index])) {
      return false
    }
  }

  return true
}

function sanitizeSecretPromptInput(
  input: string,
  state: SecretPromptParserState,
): string {
  const combinedInput = `${state.pendingEscape}${input}`
  let sanitized = ''
  let index = 0

  state.pendingEscape = ''

  while (index < combinedInput.length) {
    const remainingInput = combinedInput.slice(index)

    if (remainingInput.startsWith(BRACKETED_PASTE_START)) {
      index += BRACKETED_PASTE_START.length
      continue
    }

    if (remainingInput.startsWith(BRACKETED_PASTE_END)) {
      index += BRACKETED_PASTE_END.length
      continue
    }

    if (
      BRACKETED_PASTE_START.startsWith(remainingInput) ||
      BRACKETED_PASTE_END.startsWith(remainingInput)
    ) {
      state.pendingEscape = remainingInput
      break
    }

    if (remainingInput[0] === '\u001b') {
      const controlSequence = extractCsiControlSequence(remainingInput)

      if (controlSequence) {
        index += controlSequence.length
        continue
      }

      if (isIncompleteCsiControlSequence(remainingInput)) {
        state.pendingEscape = remainingInput
        break
      }

      if (remainingInput.length === 1) {
        state.pendingEscape = remainingInput
        break
      }

      index += 1
      continue
    }

    sanitized += remainingInput[0] ?? ''
    index += 1
  }

  return sanitized
}

export async function promptForTextValue(
  promptText: string,
  requiredMessage: string,
): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new ValidationError(requiredMessage)
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  try {
    const value = (await rl.question(promptText)).trim()

    if (!value) {
      throw new ValidationError(requiredMessage)
    }

    return value
  } finally {
    rl.close()
  }
}

export async function promptForSecretValue(
  promptText: string,
  requiredMessage: string,
): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new ValidationError(requiredMessage)
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    const stdout = process.stdout
    const previousRawMode = stdin.isRaw ?? false
    const parserState = createSecretPromptParserState()
    let value = ''

    const cleanup = (): void => {
      stdin.setRawMode(previousRawMode)
      stdin.pause()
      stdin.removeListener('data', onData)
      stdout.write('\n')
    }

    const onData = (chunk: Buffer): void => {
      const input = sanitizeSecretPromptInput(
        chunk.toString('utf8'),
        parserState,
      )

      for (const character of input) {
        if (character === '\u0003') {
          cleanup()
          reject(new ValidationError('Authentication cancelled.'))
          return
        }

        if (character === '\r' || character === '\n') {
          cleanup()

          const trimmedValue = value.trim()

          if (!trimmedValue) {
            reject(new ValidationError(requiredMessage))
            return
          }

          resolve(trimmedValue)
          return
        }

        if (character === '\b' || character === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1)
            stdout.write('\b \b')
          }

          continue
        }

        if (isPrintableInput(character)) {
          value += character
          stdout.write('*')
        }
      }
    }

    stdout.write(promptText)
    stdin.resume()
    stdin.setRawMode(true)
    stdin.on('data', onData)
  })
}
