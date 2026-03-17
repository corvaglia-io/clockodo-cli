# Commands

This document covers the commands that are implemented in the current repo state.

Clockodo CLI is a human tool first and an AI agent tool a close second. These commands are documented for direct terminal use first, with `--json` and predictable output added so reviewed workflows can also be scripted.

This project has been developed mainly with AI assistance. Review commands before enabling write-capable policies or running mutations against live data, and use the tool at your own risk.

All commands support:

- `--json`
- `--debug`
- `--profile <name>`

## Auth

### `auth login`

Validate and store Clockodo credentials for a profile.

```bash
npm run dev -- auth login
npm run dev -- auth login --profile work --set-default
npm run dev -- auth login --profile work --api-user you@example.com --api-key your-key --app-name "Clockodo CLI" --app-email you@example.com --json
```

### `auth logout`

Remove stored credentials for a profile.

```bash
npm run dev -- auth logout
npm run dev -- auth logout --profile work --json
```

### `auth status`

Show the active auth context, where values came from, and optionally validate them against Clockodo.

```bash
npm run dev -- auth status
npm run dev -- auth status --offline
npm run dev -- auth status --json
```

## Config

### `config path`

```bash
npm run dev -- config path
npm run dev -- config path --json
```

### `config show`

```bash
npm run dev -- config show
npm run dev -- config show --profile work --json
```

### `config set-default`

```bash
npm run dev -- config set-default work
npm run dev -- config set-default work --json
```

### `config policy show`

Profiles default to `read-only` for write operations.

```bash
npm run dev -- config policy show
npm run dev -- config policy show --profile work --json
```

### `config policy presets`

List the built-in safe policy presets.

```bash
npm run dev -- config policy presets
npm run dev -- config policy presets --json
```

### `config policy apply-preset`

Apply a preset policy without manually managing regex allowlist rules.

Available presets:

- `read-only`
- `timesheet-write`
- `billing-write`
- `full-access`

```bash
npm run dev -- config policy apply-preset read-only
npm run dev -- config policy apply-preset timesheet-write --profile work
npm run dev -- config policy apply-preset billing-write --profile automation --json
```

### `config policy set-mode`

Available modes:

- `read-only`
- `allow-listed-writes`
- `full-access`

```bash
npm run dev -- config policy set-mode read-only
npm run dev -- config policy set-mode full-access --profile work
npm run dev -- config policy set-mode allow-listed-writes --profile automation --json
```

### `config policy allow-write`

Add a local regex allowlist rule for writes. This is useful when you want to keep a profile narrow instead of giving it full access.

```bash
npm run dev -- config policy allow-write POST '^/v2/clock$'
npm run dev -- config policy allow-write DELETE '^/v2/clock/[0-9]+$' --profile work
npm run dev -- config policy allow-write POST '^/v2/entries$' --profile work --json
```

### `config policy remove-write`

```bash
npm run dev -- config policy remove-write POST '^/v2/clock$'
npm run dev -- config policy remove-write DELETE '^/v2/clock/[0-9]+$' --profile work --json
```

## User Context

### `me`

Show the current authenticated Clockodo user.

```bash
npm run dev -- me
npm run dev -- me --json
```

## Stopwatch

### `clock status`

Show the current stopwatch state.

```bash
npm run dev -- clock status
npm run dev -- clock status --json
```

### `clock in`

Start the running stopwatch.

Note: `clock in`, `clock switch`, and `clock out` are mutating commands. They are blocked until the active profile policy allows writes.

```bash
npm run dev -- clock in --customer 10001 --project 20001 --service 30001 --text "Focused work"
npm run dev -- clock in --customer 10001 --project 20001 --service 30001 --json
```

### `clock switch`

Stop the current stopwatch and start another one immediately.

```bash
npm run dev -- clock switch --customer 10001 --project 20002 --service 30002 --text "Support follow-up"
npm run dev -- clock switch --customer 10001 --project 20002 --service 30002 --json
```

### `clock out`

Stop the running stopwatch.

```bash
npm run dev -- clock out
npm run dev -- clock out --json
```

## Lookup Domains

### `customers list|get`

```bash
npm run dev -- customers list --active --limit 10
npm run dev -- customers get 10001 --json
```

### `projects list|get`

```bash
npm run dev -- projects list --customer 10001 --active --limit 10
npm run dev -- projects get 20001 --json
```

### `services list|get`

```bash
npm run dev -- services list
npm run dev -- services get 30001 --json
```

### `users list|get`

```bash
npm run dev -- users list --limit 10
npm run dev -- users get 40001 --json
```

## Billing

### `billing report`

Extract invoice-ready grouped data from Clockodo via `entrygroups`.

Defaults:

- default grouping is `customer`, `project`, `service`
- use `--json` for downstream scripting or piping into other tools
- use `--last-month` for the most common monthly invoicing window

```bash
npm run dev -- billing report --last-month
npm run dev -- billing report --month 2026-02 --group-by customer --json
npm run dev -- billing report --month 2026-02 --customer 10001 --group-by customer --group-by project --group-by service --json
npm run dev -- billing report --month 2026-02 --customer 10001 --calcHardBudgetRevenue --json
```

Useful flags:

- `--month YYYY-MM`
- `--last-month`
- `--since` with `--until`
- `--group-by customer|project|service|user|text|month|week|day|billable|subproject|lumpsum-service|is-lumpsum|year`
- `--customer`
- `--project`
- `--service`
- `--user`
- `--text`
- `--billable 0|1|2`
- `--budgetType <Clockodo budget filter>`
- `--calcHardBudgetRevenue`
- `--prepend-customer-to-project-name`
- `--round-to <minutes>`

### `billing export`

Export grouped Clockodo billing rows as Bexio-ready invoice draft bundles.

Defaults:

- export format is currently `bexio`
- billable filter defaults to `1`
- invoice documents are grouped per customer
- invoice line grouping defaults to `project`, `service`
- use `--mapping-file` to attach Bexio `contactId` and position defaults

```bash
npm run dev -- billing export --last-month --format bexio --json
npm run dev -- billing export --month 2026-02 --mapping-file ./docs/examples/bexio-billing-map.example.json --json
npm run dev -- billing export --month 2026-02 --customer 10001 --mapping-file ./docs/examples/bexio-billing-map.example.json --readyOnly --json
```

Useful flags:

- `--format bexio`
- `--month YYYY-MM`
- `--last-month`
- `--since` with `--until`
- `--invoice-date YYYY-MM-DD`
- `--line-group-by project|service|subproject|text|month|week|day|billable|user|lumpsum-service|is-lumpsum|year`
- `--mapping-file <path>`
- `--customer`
- `--project`
- `--service`
- `--user`
- `--text`
- `--billable 0|1|2`
- `--budgetType <Clockodo budget filter>`
- `--calcHardBudgetRevenue`
- `--round-to <minutes>`
- `--readyOnly`

The JSON result includes:

- `documents[].ready`: whether the draft has enough mapping data to create in Bexio
- `documents[].blocking_issues`: missing data such as `contactId`, `accountId`, `taxId`, or `unitId`
- `documents[].bexio_draft`: a document object plus composed custom positions for `bexio invoices create`
- `documents[].billing_mark_billed_filter`: the matching Clockodo filter to use later with `billing mark-billed`

### `billing mark-billed`

Mark matching entries as billed via Clockodo `entrygroups`. The command asks for confirmation unless you pass `--yes`.

This command is also subject to the local write policy.

```bash
npm run dev -- billing mark-billed --month 2026-02 --customer 10001
npm run dev -- billing mark-billed --last-month --customer 10001 --project 20001 --yes
npm run dev -- billing mark-billed --month 2026-02 --customer 10001 --json --yes
```

Useful flags:

- `--month YYYY-MM`
- `--last-month`
- `--since` with `--until`
- `--customer`
- `--project`
- `--service`
- `--user`
- `--text`
- `--budgetType <Clockodo budget filter>`
- `--yes`
- `--no-interactive`

### `projects mark-billed`

Mark a project as billed. This is especially useful for project-budget billing cases.

```bash
npm run dev -- projects mark-billed 20001
npm run dev -- projects mark-billed 20001 --amount 2500
npm run dev -- projects mark-billed 20001 --amount 2500 --yes --json
```

## Entries

### `entries today`

List entries for the current local day.

```bash
npm run dev -- entries today
npm run dev -- entries today --user 40001 --json
```

### `entries list`

List entries for an explicit range.

```bash
npm run dev -- entries list --since 2026-03-16 --until 2026-03-16
npm run dev -- entries list --today --project 20001 --json
```

### `entries get`

Show a single entry.

```bash
npm run dev -- entries get 50001
npm run dev -- entries get 50001 --json
```

### `entries add time`

Create a manual time entry.

This command is subject to the local write policy.

Two time-input styles are supported:

- explicit datetimes with `--since` and `--until`
- local day/time flags with `--date`, `--from`, and `--to`

```bash
npm run dev -- entries add time --customer 10001 --project 20001 --service 30001 --billable 0 --date 2026-03-16 --from 09:00 --to 09:30 --text "Daily review"
npm run dev -- entries add time --customer 10001 --project 20001 --service 30001 --billable 1 --since 2026-03-16T09:00 --until 2026-03-16T09:30 --json
```

Flags:

- `--customer` required
- `--service` required
- `--billable` required, allowed values: `0`, `1`
- `--project` optional but may be required by your Clockodo account
- `--user` optional
- `--text` optional

### `entries update`

Update an existing entry.

This command is subject to the local write policy.

Supported update fields:

- `--customer`
- `--project`
- `--service`
- `--user`
- `--billable`
- `--text`
- `--since`
- `--until`
- `--date` with `--from` and/or `--to`

```bash
npm run dev -- entries update 50001 --date 2026-03-16 --from 09:15 --to 09:45
npm run dev -- entries update 50001 --project 20002 --service 30002 --billable 1 --text "Updated note" --json
```

Allowed `--billable` values for update: `0`, `1`, `2`, `12`.

### `entries delete`

Delete an entry. By default the command asks for confirmation in an interactive terminal.

This command is subject to the local write policy.

```bash
npm run dev -- entries delete 50001
npm run dev -- entries delete 50001 --yes
npm run dev -- entries delete 50001 --yes --json
```

Deletion flags:

- `--yes` bypass confirmation
- `--no-interactive` fail instead of prompting

## Invoice Workflow Sample

One practical monthly flow with `bexio-cli` in the middle looks like this:

```bash
npm run dev -- billing export --last-month --format bexio --mapping-file ./docs/examples/bexio-billing-map.example.json --json \
  | jq '.data.documents[] | select(.ready) | .bexio_draft'
# pass each bexio_draft object into bexio invoices create
npm run dev -- config policy apply-preset billing-write --profile work
npm run dev -- billing mark-billed --last-month --customer 10001 --yes
# for project-budget billing cases:
npm run dev -- projects mark-billed 20001 --amount 2500 --yes
```

## JSON Contract

Read commands return:

```json
{ "data": { ... } }
```

or

```json
{ "data": [ ... ], "meta": { ... } }
```

Errors return:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Clockodo validation message",
    "details": { ... }
  }
}
```
