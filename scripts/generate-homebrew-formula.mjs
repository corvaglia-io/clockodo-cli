#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

function printUsage() {
  console.error(
    [
      'Usage:',
      '  node scripts/generate-homebrew-formula.mjs --sha256 <sha256> [--url <url>] [--out <path>] [--version <version>]',
      '',
      'Defaults:',
      '  --url defaults to the GitHub release asset URL for the current package version.',
    ].join('\n'),
  )
}

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`)
    }

    const key = token.slice(2)
    const value = argv[index + 1]

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`)
    }

    args[key] = value
    index += 1
  }

  return args
}

function toRubyClassName(packageName) {
  return packageName
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function quoteRubyString(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

const scriptDir = path.dirname(new URL(import.meta.url).pathname)
const rootDir = path.resolve(scriptDir, '..')
const packageJsonPath = path.join(rootDir, 'package.json')
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))

let args

try {
  args = parseArgs(process.argv.slice(2))
} catch (error) {
  printUsage()
  console.error(`\n${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
  process.exit()
}

if (!args.sha256) {
  printUsage()
  console.error('\n--sha256 is required.')
  process.exitCode = 1
  process.exit()
}

const version = args.version ?? packageJson.version
const repository = 'https://github.com/corvaglia-io/clockodo-cli'
const packageFilename = `${packageJson.name}-${version}.tgz`
const releaseUrl =
  args.url ??
  `${repository}/releases/download/v${version}/${packageFilename}`
const rubyClassName = toRubyClassName(packageJson.name)
const binaryName = Object.keys(packageJson.bin ?? {})[0] ?? packageJson.name

const formula = `class ${rubyClassName} < Formula
  desc "${quoteRubyString(packageJson.description)}"
  homepage "${repository}"
  url "${quoteRubyString(releaseUrl)}"
  sha256 "${quoteRubyString(args.sha256)}"
  license "${quoteRubyString(packageJson.license)}"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir[libexec/"bin/*"]
  end

  test do
    output = shell_output("#{bin}/${binaryName} --help")
    assert_match "${quoteRubyString(binaryName)}", output
  end
end
`

if (args.out) {
  const outputPath = path.resolve(process.cwd(), args.out)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, formula, 'utf8')
} else {
  process.stdout.write(formula)
}
