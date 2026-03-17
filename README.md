# Clockodo CLI

A terminal-first CLI for Clockodo, focused on fast daily time tracking, manual entry management, monthly billing extraction, and stable JSON output for scripting.

Clockodo CLI is a human tool first and an AI agent tool a close second. The default UX, command structure, and safety model are optimized for a person working in a terminal, with stable JSON available for automation once the workflow has been reviewed.

This project has been developed mainly with AI assistance. Review the code and commands before trusting it with live data, and use it at your own risk.

## Current Status

The CLI currently supports:

- profile-backed authentication with `auth login`, `auth status`, and `auth logout`
- configuration and local write-policy management with `config path`, `config show`, `config set-default`, and `config policy ...`
- current user lookup with `me`
- stopwatch workflows with `clock status`, `clock in`, `clock switch`, and `clock out`
- read-only lookup commands for `customers`, `projects`, `services`, `users`, and `entries`
- manual time-entry workflows with `entries add time`, `entries update`, and `entries delete`
- invoice-prep extraction with `billing report` and `billing export --format bexio`
- billed-state updates with `billing mark-billed` and `projects mark-billed`

The repository is not packaged for npm publication yet, so the current install path is local development usage.

## Quick Start

See [docs/INSTALL.md](docs/INSTALL.md) for setup details.

Homebrew install is now available:

```bash
brew install corvaglia-io/tap/clockodo-cli
```

Minimal local setup:

```bash
npm install
npm run build
npm run smoke
```

Authenticate with a stored profile:

```bash
npm run dev -- auth login --profile work --set-default
npm run dev -- auth status --json
```

Stored profiles default to `read-only` write policy, so enable writes explicitly before stopwatch or entry mutations:

```bash
npm run dev -- config policy apply-preset timesheet-write --profile work
```

Environment variables still work and override stored values when set:

```bash
export CLOCKODO_API_USER="you@example.com"
export CLOCKODO_API_KEY="your-api-key"
export CLOCKODO_APP_NAME="Clockodo CLI"
export CLOCKODO_APP_EMAIL="you@example.com"
```

Run commands from source:

```bash
npm run dev -- me --json
npm run dev -- clock status
npm run dev -- entries today
npm run dev -- billing report --last-month --json
npm run dev -- billing export --last-month --format bexio --json
```

Run the built CLI:

```bash
node ./bin/run.js me
node ./bin/run.js entries add time --help
npm link
```

## Documentation

- [docs/INSTALL.md](docs/INSTALL.md): prerequisites, setup, authentication, and local run modes
- [docs/COMMANDS.md](docs/COMMANDS.md): implemented commands and sample invocations
- [docs/HOMEBREW.md](docs/HOMEBREW.md): how to publish and install the CLI through a Homebrew tap
- [docs/examples/bexio-billing-map.example.json](docs/examples/bexio-billing-map.example.json): example Clockodo customer to Bexio contact mapping
- [docs/clockodo-cli-prd-v1.md](docs/clockodo-cli-prd-v1.md): product scope and roadmap
- [docs/CLOCKODO-CONVENTIONS.md](docs/CLOCKODO-CONVENTIONS.md): contributor conventions
- [docs/CLOCKODO-API-REFERENCE.md](docs/CLOCKODO-API-REFERENCE.md): implementation-oriented API notes
- [docs/openapi.yaml](docs/openapi.yaml): bundled Clockodo OpenAPI source of truth

## Notes

- This is a human-first CLI. Agent and automation support exist to extend reviewed workflows, not to replace operator judgment.
- The project was built mainly with AI assistance, so read the docs, inspect commands, and validate against your own Clockodo setup before using write-capable flows.
- Stored profiles default to `read-only` local write policy. Use `config policy apply-preset` or the lower-level allowlist commands before mutating commands.
- Environment variables remain supported and override stored profile values when present.
- Some Clockodo accounts disable customer-only time tracking. In those accounts, manual entries and stopwatch actions must include a valid `--project`.
- Mutating commands disable automatic retries to reduce the risk of duplicate stopwatch or entry actions.
- `billing export --format bexio` is the handoff path for monthly invoice creation with `bexio-cli`. Use a mapping file to attach Bexio contact and position defaults.
- `billing mark-billed` marks matching entries billed through Clockodo entry groups. `projects mark-billed` is the project-level billed action for budget-style projects.
