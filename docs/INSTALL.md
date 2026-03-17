# Install

Clockodo CLI is a human tool first and an AI agent tool a close second. It is designed for a person reviewing what will happen before they run it, even when the same commands are later reused in automation.

This project has been developed mainly with AI assistance. Review the code, config, and commands before using it with live data, and use it at your own risk.

## Prerequisites

- Node.js 22 or newer
- npm
- a Clockodo API user email
- a Clockodo API key
- an external application name and contact email for the required `X-Clockodo-External-Application` header

## Local Setup

Install dependencies:

```bash
npm install
```

Build the CLI:

```bash
npm run build
```

Run the local smoke check:

```bash
npm run smoke
```

Optional local command styles:

```bash
npm run dev -- me
node ./bin/run.js me
npm link
```

`npm run dev -- ...` runs the TypeScript source directly.

`node ./bin/run.js ...` runs the built CLI from `dist/`.

`npm link` installs the current checkout as a global `clockodo` command on your machine.

## Authentication

You can authenticate either with a stored profile or with environment variables.

Stored profile flow:

```bash
npm run dev -- auth login --profile work --set-default
npm run dev -- auth status --json
```

If you omit required flags, `auth login` prompts for:

- Clockodo API user
- Clockodo API key
- external app name
- external app email

```bash
export CLOCKODO_API_USER="you@example.com"
export CLOCKODO_API_KEY="your-api-key"
export CLOCKODO_APP_NAME="Clockodo CLI"
export CLOCKODO_APP_EMAIL="you@example.com"
```

Optional variables:

```bash
export CLOCKODO_PROFILE="work"
export CLOCKODO_BASE_URL="https://my.clockodo.com/api"
export CLOCKODO_LOCALE="en"
export CLOCKODO_DEBUG="1"
```

Check that auth works:

```bash
npm run dev -- auth status --json
npm run dev -- me
```

Inspect config paths or the active profile state:

```bash
npm run dev -- config path
npm run dev -- config show --json
```

## Local Write Policy

Each profile has a local request policy. New profiles start in `read-only` mode, which means:

- read commands work immediately
- stopwatch, entry mutations, and billed-state commands are blocked locally until you opt in
- this is intentional because the CLI is expected to be reviewed by a human before it is allowed to mutate live data

Preset-based policy setup is the easiest path:

```bash
npm run dev -- config policy presets
npm run dev -- config policy apply-preset timesheet-write --profile work
npm run dev -- config policy apply-preset billing-write --profile work
```

Allow all writes for a profile:

```bash
npm run dev -- config policy set-mode full-access --profile work
```

Or keep a narrow allowlist:

```bash
npm run dev -- config policy set-mode allow-listed-writes --profile work
npm run dev -- config policy allow-write POST '^/v2/clock$' --profile work
npm run dev -- config policy allow-write DELETE '^/v2/clock/[0-9]+$' --profile work
npm run dev -- config policy allow-write POST '^/v2/entries$' --profile work
npm run dev -- config policy allow-write PUT '^/v2/entries/[0-9]+$' --profile work
```

Inspect the current policy:

```bash
npm run dev -- config policy show --profile work
```

The built-in presets are:

- `read-only`: block all writes
- `timesheet-write`: allow stopwatch and entry mutations
- `billing-write`: allow `billing mark-billed` and `projects mark-billed`
- `full-access`: allow all writes

## First Commands

Read-only checks:

```bash
npm run dev -- customers list --limit 5
npm run dev -- projects list --customer 10001 --limit 5
npm run dev -- services list
npm run dev -- entries today
npm run dev -- billing report --last-month --group-by customer --json
```

Stopwatch flow:

```bash
npm run dev -- config policy apply-preset timesheet-write --profile work
npm run dev -- clock in --customer 10001 --project 20001 --service 30001 --text "Focused work"
npm run dev -- clock status
npm run dev -- clock out
```

Manual time entry flow:

```bash
npm run dev -- config policy apply-preset timesheet-write --profile work
npm run dev -- entries add time --customer 10001 --project 20001 --service 30001 --billable 0 --date 2026-03-16 --from 09:00 --to 09:30 --text "Daily review"
npm run dev -- entries update 123 --date 2026-03-16 --from 09:15 --to 09:45
npm run dev -- entries delete 123 --yes
```

Monthly invoice-prep flow:

```bash
npm run dev -- billing report --last-month --json
npm run dev -- billing export --month 2026-02 --format bexio --mapping-file ./docs/examples/bexio-billing-map.example.json --json
npm run dev -- config policy apply-preset billing-write --profile work
npm run dev -- billing mark-billed --month 2026-02 --customer 10001 --yes
npm run dev -- projects mark-billed 20001 --amount 2500 --yes
```

One practical handoff with `bexio-cli` is:

```bash
npm run dev -- billing export --month 2026-02 --format bexio --mapping-file ./docs/examples/bexio-billing-map.example.json --json \
  | jq '.data.documents[] | select(.ready) | .bexio_draft'
```

That extracted `bexio_draft` object can then be passed to `bexio invoices create`.

## Account-Specific Note

Some Clockodo accounts do not allow customer-only tracking. If Clockodo returns an error similar to `Tracking times for customers is not allowed.`, include a valid `--project` for stopwatch and manual entry commands.

For billing workflows, `billing mark-billed` updates matching entries through Clockodo `entrygroups`. If a project uses project-budget billing semantics, use `projects mark-billed` after invoicing that project.
