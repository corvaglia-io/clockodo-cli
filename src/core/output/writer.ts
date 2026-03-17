import process from 'node:process'

interface OutputOptions {
  readonly columns?: readonly string[]
  readonly json?: boolean
  readonly meta?: Record<string, unknown>
  readonly title?: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return JSON.stringify(value)
}

function orderKeys(
  record: Record<string, unknown>,
  preferredKeys: readonly string[] = [],
): string[] {
  const preferred = preferredKeys.filter((key) => key in record)
  const remainder = Object.keys(record).filter((key) => !preferred.includes(key))

  return [...preferred, ...remainder]
}

function formatRecord(
  record: Record<string, unknown>,
  options: OutputOptions,
): string {
  const keys = orderKeys(record, options.columns)
  const lines = keys.map((key) => `${key}: ${formatValue(record[key])}`)

  if (options.title) {
    return [options.title, ...lines].join('\n')
  }

  return lines.join('\n')
}

function formatTable(rows: readonly Record<string, unknown>[], options: OutputOptions): string {
  if (rows.length === 0) {
    return options.title ? `${options.title}\nNo results.` : 'No results.'
  }

  const firstRow = rows[0]!
  const columns =
    options.columns && options.columns.length > 0
      ? [...options.columns]
      : Object.keys(firstRow)
  const widths = columns.map((column) =>
    Math.max(
      column.length,
      ...rows.map((row) => formatValue(row[column]).length),
    ),
  )

  const header = columns
    .map((column, index) => column.padEnd(widths[index] ?? column.length))
    .join('  ')
  const separator = widths.map((width) => '-'.repeat(width)).join('  ')
  const body = rows.map((row) =>
    columns
      .map((column, index) =>
        formatValue(row[column]).padEnd(widths[index] ?? column.length),
      )
      .join('  '),
  )

  if (options.title) {
    return [options.title, header, separator, ...body].join('\n')
  }

  return [header, separator, ...body].join('\n')
}

export function outputResult(data: unknown, options: OutputOptions = {}): void {
  if (options.json) {
    const envelope = options.meta
      ? { data, meta: options.meta }
      : { data }
    process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`)
    return
  }

  if (Array.isArray(data)) {
    if (data.every(isPlainObject)) {
      process.stdout.write(
        `${formatTable(data as ReadonlyArray<Record<string, unknown>>, options)}\n`,
      )
      return
    }

    process.stdout.write(`${data.map(formatValue).join('\n')}\n`)
    return
  }

  if (isPlainObject(data)) {
    process.stdout.write(`${formatRecord(data, options)}\n`)
    return
  }

  process.stdout.write(`${formatValue(data)}\n`)
}
