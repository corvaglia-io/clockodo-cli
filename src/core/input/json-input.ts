import { readFile } from 'node:fs/promises'

import { ValidationError } from '../errors/errors.js'

function parseJson(rawJson: string, source: string): unknown {
  try {
    return JSON.parse(rawJson) as unknown
  } catch {
    throw new ValidationError(`${source} must contain valid JSON.`)
  }
}

export async function loadJsonFile(filePath: string): Promise<unknown> {
  try {
    const fileContents = await readFile(filePath, 'utf8')
    return parseJson(fileContents, `File '${filePath}'`)
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }

    throw new ValidationError(`Could not read JSON file '${filePath}'.`)
  }
}
