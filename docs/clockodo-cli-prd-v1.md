# Clockodo CLI — Product Requirements Document

**Status:** v1  
**Last updated:** 2026-03-16  
**Owner:** Maintainers

---

## 1. Purpose

Build a CLI for the Clockodo API that is excellent for daily terminal use, while also being stable enough for scripting and coding agents.

This is not an AI CLI. AI helps build it. The product itself is a serious wrapper around the Clockodo API for time tracking workflows.

---

## 2. Problem Statement

Clockodo exposes a useful API, but raw use is annoying for practical work:

- authentication requires multiple custom headers
- endpoint behavior is spread across legacy pages and a newer docs portal
- entry creation has multiple modes and non-obvious required fields
- stopwatch control is easy in theory and fiddly in practice
- there is no official CLI
- the known community CLIs appear small and lightly adopted rather than mature, broadly trusted tools
- the best community artifact appears to be an unofficial SDK, not a CLI

Humans can brute-force this with cURL and shell scripts, but that is how terminal goblins are born.

---

## 3. Product Vision

Create a modern CLI that wraps the most useful parts of Clockodo with:

- clean command structure
- reliable authentication and profile management
- fast stopwatch workflows
- predictable machine-readable output
- strong error handling
- a codebase structure that AI can extend without producing architectural soup

The CLI should feel like a real engineering tool for time tracking, not a weekend wrapper around HTTP.

---

## 4. Goals

### Primary goals

- Make Clockodo stopwatch and entry workflows fast for human users.
- Provide stable JSON output for scripts and automation.
- Reduce reliance on one-off cURL snippets.
- Establish a codebase structure that can be extended safely.

### Secondary goals

- Support both interactive and non-interactive usage.
- Make the project easy to extend with additional Clockodo domains.
- Stay deliberately narrow in v1.

### Non-goals

- Building a full TUI.
- Covering every Clockodo endpoint in the first release.
- Embedding AI into runtime commands.
- Replacing the Clockodo web application.
- Supporting deep admin flows like absence and overtime policies in v1.

---

## 5. Target Users

### Primary user

A technical operator, developer, consultant, or founder who wants to interact with Clockodo quickly from the terminal.

### Secondary user

Scripts, automation, and coding agents that use the CLI as a stable interface.

Human-first still wins. Machines are patient little gremlins. People are not.

---

## 6. Core Product Principles

1. **Human-first UX** — Fast and obvious for daily usage.
2. **Machine-safe behavior** — Deterministic JSON, clear exit codes, clean stdout/stderr split.
3. **Clock-first design** — Stopwatch workflows matter more than broad CRUD coverage.
4. **Thin abstraction** — Stay close to Clockodo concepts and field names.
5. **Narrow scope first** — Ship a sharp knife, not a giant blunt spoon.
6. **AI-friendly codebase** — Conventions, tests, and structure must be extension-friendly.

---

## 7. User Needs

### Human user needs

- authenticate once without wrestling custom headers every time
- quickly start, stop, and switch the running timer
- inspect today’s entries without building API calls by hand
- resolve customers, projects, and services from the terminal
- add or fix entries safely
- get readable output by default
- switch to JSON when scripting
- understand failures clearly

### Coding agent / automation needs

- stable command names
- consistent flag semantics
- deterministic JSON
- meaningful exit codes
- no prompts unless explicitly requested
- clear separation of stdout and stderr
- reliable profile handling

---

## 8. Product Scope — Phasing

### Phase 1 — Foundation + Stopwatch

**Objective:** Build the core platform and the high-value clock workflow.

Includes:

- CLI scaffold (oclif + TypeScript)
- config/profile system (`~/.config/clockodo-cli/`)
- auth flow using Clockodo email + API key + external app metadata
- secure credential storage
- shared HTTP client with retry/error handling
- output framework (human default + `--json`)
- logging/debug mode
- `raw` command
- `me` command using `/v4/users/me`
- `clock` command group (`status`, `in`, `out`, `switch`)

**Deliverable outcome:** The CLI can authenticate, identify the active user, and drive the running stopwatch.

### Phase 2 — Core Read Workflows

**Objective:** Support the main lookup workflows needed for timer usage.

Committed domains:

1. `customers`
2. `projects`
3. `services`
4. `entries`
5. `users` (read-only)

Each domain includes:

- `list`
- `get`
- `today` convenience flow for entries
- basic search/filter flags
- `--json` output with stable field names
- human-readable table output by default

**Deliverable outcome:** Users can resolve IDs and inspect time-tracking data comfortably.

### Phase 3 — Safe Entry Writes

**Objective:** Make the CLI operational for real work, not just peeking.

Includes:

- `entries add`
- `entries update`
- `entries delete`
- safe confirmation behavior for destructive actions
- Zod validation before submission

**Deliverable outcome:** The CLI becomes a daily driver.

### Phase 4 — Agent and Automation Hardening

**Objective:** Make the CLI excellent as a stable automation boundary.

Includes:

- stronger JSON contract tests
- shell completion
- richer filtering
- better docs/examples
- release packaging

### Phase 5 — Expansion

**Objective:** Add broader Clockodo workflows based on real usage.

Possible domains:

- `entrygroups`
- `entriesTexts`
- `worktime`
- `absences`
- `teams`
- `target-hours`
- `overtime`

---

## 9. Functional Requirements

### 9.1 Authentication

Clockodo authentication requires more than a single token. The CLI must manage a profile containing:

- API user email
- API key
- external application name
- external application contact email
- optional base URL override
- optional locale override for `Accept-Language`

**Requirements:**

- `auth login` — prompt for credentials and validate them
- `auth status` — show active profile and validation state
- `auth logout` — remove stored credentials for the profile
- multiple named profiles
- secure storage in `~/.config/clockodo-cli/credentials.json` with restrictive permissions
- environment variable overrides:
  - `CLOCKODO_API_USER`
  - `CLOCKODO_API_KEY`
  - `CLOCKODO_APP_NAME`
  - `CLOCKODO_APP_EMAIL`
  - `CLOCKODO_PROFILE`
  - `CLOCKODO_BASE_URL`
  - `CLOCKODO_LOCALE`
- never log secrets

**Validation endpoint:**

```text
GET /v4/users/me
```

**Compatibility note:** `GET /v2/aggregates/users/me` is still useful as a temporary legacy bridge if company/worktime context is needed, but new implementation work should not depend on it by default.

### 9.2 Configuration and Profiles

**Config location:** `~/.config/clockodo-cli/`

**Files:**

- `config.json` — profiles, default profile, preferences
- `credentials.json` — secret values (0600 permissions)

**Requirements:**

- named profiles
- default profile selection
- `config show`
- `config path`
- environment variable overrides take precedence over stored config

**Base API URL default:** `https://my.clockodo.com/api`

### 9.3 Command Structure

```text
clockodo auth       — authentication management
clockodo config     — configuration and profiles
clockodo me         — current user / auth context
clockodo clock      — running stopwatch control
clockodo entries    — time entry operations
clockodo customers  — customers
clockodo projects   — projects
clockodo services   — services
clockodo users      — coworkers
clockodo raw        — direct API escape hatch
```

**Naming rules:**

- resource commands are plural nouns
- actions are subcommands
- standard verbs: `list`, `get`, `add`, `update`, `delete`
- action-style group for stopwatch: `status`, `in`, `out`, `switch`
- no command aliases in v1

### 9.4 Output Modes

**Requirements:**

- default: readable tables / concise status output
- `--json`: machine-readable JSON to stdout
- stdout reserved for data only
- stderr reserved for errors, warnings, progress, debug
- JSON output is a compatibility contract within a major version

Suggested JSON envelopes:

```json
{
  "data": [ ... ]
}
```

```json
{
  "data": { ... }
}
```

For status-oriented commands like `clock status`:

```json
{
  "data": {
    "running": true,
    "entry": { ... }
  }
}
```

Upstream API wrappers vary by endpoint version. The CLI must normalize them into the stable CLI envelope above rather than leaking raw Clockodo response wrappers to users.

### 9.5 Read Operations

**Clock**

- `clock status`
- `clock in --customer <id> --service <id> [--project <id>] [--text <text>]`
- `clock out`
- `clock switch --customer <id> --service <id> [--project <id>] [--text <text>]`

**Me**

- `me`

**Customers / Projects / Services / Users**

- `list`
- `get <id>`
- optional `search` later if query semantics prove useful

**Entries**

- `list`
- `get <id>`
- `today`
- date/user filters
- explicit date range support for `--since` / `--until`

### 9.6 Write Operations

Start with entries only.

**Requirements:**

- `entries add`
- `entries update <id>`
- `entries delete <id>`
- validation per entry mode before submission
- `--yes` for destructive confirmation bypass
- `--no-interactive` support

Write support for customers/projects/services should be deferred until usage proves it necessary.

### 9.7 Entry Creation UX

Because Clockodo supports three entry creation modes, the CLI must model them explicitly.

Option A:

```text
clockodo entries add time ...
clockodo entries add lumpsum ...
clockodo entries add service-lumpsum ...
```

Option B:

```text
clockodo entries add --mode time ...
```

**Decision:** Prefer explicit subcommands (`time`, `lumpsum`, `service-lumpsum`) because they reduce ambiguity and improve help output.

The current OpenAPI schema exposes one flexible create payload, but the CLI should still model the three entry modes explicitly so users do not have to reverse-engineer valid field combinations.

### 9.8 Raw API Escape Hatch

The CLI must include:

```text
clockodo raw <method> <path> [--data <payload>] [--header <key:value>]
```

**Requirements:**

- inherit active auth/profile
- auto-inject Clockodo auth headers
- support custom headers
- no auto-pagination magic
- available from day one

### 9.9 Error Handling

**Exit codes:**

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Auth failure |
| 3 | Validation error |
| 4 | Not found |
| 5 | Rate limited |
| 6 | API/server error |
| 7 | Network error |
| 8 | Configuration error |

**Rules:**

- human-readable actionable errors in normal mode
- structured error object in JSON mode on stderr
- preserve raw details in debug mode

### 9.10 Rate Limiting and Retries

Clockodo’s legacy docs do not clearly expose one canonical public rate-limit contract in the sources used here, so the CLI should implement conservative retry behavior for transient failures.

**Initial strategy:**

- retry on `408`, `429`, `500`, `502`, `503`, `504`
- truncated exponential backoff with jitter
- max retries: 5
- base delay: 1 second
- max delay: 60 seconds
- warning to stderr on retry

If live inspection shows concrete rate-limit headers, fold them into the client later.

### 9.11 Logging and Debugging

- `--debug` or `CLOCKODO_DEBUG=1`
- log method, URL, status, timing, normalized request metadata
- mask API key and sensitive headers
- optionally allow a more verbose debug level later

---

## 10. UX Requirements

### Human-first defaults

- command names must be obvious
- help output includes examples
- default output should be readable without extra flags
- stopwatch commands should optimize for speed

### Automation-safe rules

- any command can run non-interactively
- `--json` must never include decoration
- prompts must be suppressible
- stdout is data, stderr is everything else

### UX tension rule

When human speed and automation safety clash, support both explicitly rather than doing haunted magic.

---

## 11. Technical Requirements

### Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Fast development, good AI-assisted ergonomics |
| Runtime | Node.js LTS | Standard CLI runtime |
| CLI framework | oclif | Good command/help structure, future-proof enough |
| Validation | Zod | Runtime validation and schema-first approach |
| HTTP client | `undici` wrapper | Centralized auth, retries, debug, output shaping |
| Testing | Vitest | Fast, TS-native |
| Linting | ESLint + Prettier | Consistency |

### API Version Strategy

Use the latest supported endpoint version for each domain unless a documented product need requires a legacy bridge.

| Domain | Primary endpoint family | Notes |
|--------|-------------------------|-------|
| `me` | `/v4/users/me` | Supported identity probe |
| `clock` | `/v2/clock` | Current stopwatch API in bundled spec |
| `entries` | `/v2/entries` | Current entry API in bundled spec |
| `customers` | `/v3/customers` | Successor to deprecated `/v2/customers` |
| `projects` | `/v4/projects` | Successor to deprecated `/v2/projects` |
| `services` | `/v4/services` | Successor to deprecated `/v2/services` |
| `users` | `/v3/users` | Successor to deprecated `/v2/users` |
| `entriesTexts` | `/v3/entriesTexts` | Later quality-of-life feature |
| `teams` | `/v3/teams` | Later expansion path |

The bundled OpenAPI document dated 2026-03-12 includes migration guidance for legacy endpoints by 2026-05-01, so new development should start on the current families above.

### Architecture

```text
src/
  commands/
    auth/
    config/
    me.ts
    clock/
    entries/
    customers/
    projects/
    services/
    users/
    raw.ts
  core/
    auth/
    config/
    http/
    output/
    errors/
  services/
    clockodo/
      me.ts
      clock.ts
      entries.ts
      customers.ts
      projects.ts
      services.ts
      users.ts
  types/
tests/
  unit/
  integration/
  fixtures/
```

### Architecture rules

1. command handlers stay thin
2. all API logic lives in services
3. all network access goes through one shared HTTP client
4. auth/config/output concerns remain centralized
5. schemas are explicit and fixture-driven
6. `entries` is the gold-standard CRUD domain
7. `clock` is the gold-standard action domain
8. current endpoint versions win over legacy examples unless explicitly documented otherwise

---

## 12. Versioning and Compatibility Policy

Use strict SemVer.

Within a major version:

- command names do not change
- flag names do not change
- exit code meanings do not change
- JSON field names and types do not change
- additive fields are allowed

---

## 13. AI-Assisted Development Strategy

AI should help with:

- scaffolding new command groups
- generating repetitive service wrappers
- writing tests from fixtures
- producing docs/examples

Humans must own:

- UX decisions
- auth/security review
- schema verification against live API
- release review
- compatibility policy enforcement

The codebase should be designed so an agent can extend it without inventing a new religion every third file.

---

## 14. Clockodo API Notes That Matter

- Authentication uses custom headers, not just a bearer token.
- `X-Clockodo-External-Application` matters and must be modeled as first-class config.
- the bundled API surface is version-mixed: `clock` and `entries` stay on `v2`, while other domains have newer supported versions.
- `/v4/users/me` should be the default auth validation endpoint.
- `entries` creation has three modes with different required fields.
- stopwatch control is central to product value and deserves first-class commands.
- work time APIs are separate from normal time-entry APIs.
- Clockodo now has newer documentation plus an OpenAPI document, which can help with future schema generation, but live fixtures should still be the source of truth.
- current list endpoints commonly include a `paging` object, but response envelopes still differ by API version and domain.

---

## 15. Success Metrics

### Product success

- a user can install, authenticate, and start a timer in under 2 minutes
- daily clock-in / clock-out becomes faster than using raw API calls or browser detours
- resolving customers/projects/services for timer workflows feels frictionless
- entries can be listed and fixed without custom scripts

### Engineering success

- new domains can be added without touching core architecture
- test suite catches regressions in auth, clock behavior, and output
- coding agents can add a standard read-only domain in under 30 minutes following conventions

---

## 16. Risks and Mitigations

### Risk: Scope explosion

Trying to cover absences, holidays, work times, teams, overtime, and every niche endpoint immediately.

**Mitigation:** Keep v1 centered on clock + entries + lookup resources + raw.

### Risk: Confusing timer semantics

The stopwatch API and entry CRUD get mixed together in a bad abstraction stew.

**Mitigation:** Separate `clock` service/commands from `entries` service/commands.

### Risk: Schema drift

Docs and real API responses differ.

**Mitigation:** fixture-first schema design; validate against real responses before hardening types.

### Risk: Auth pain

Users hate entering four separate config values.

**Mitigation:** `auth login` should ask once, validate immediately, and store as a profile.

### Risk: Breaking automation

JSON output changes casually and scripts explode.

**Mitigation:** treat JSON output as a product contract and test it.

---

## 17. Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Official CLI exists? | No | Build our own |
| Community CLI mature enough? | No | Existing ones are small/lightly adopted |
| Best ecosystem artifact | Community TypeScript SDK | Better foundation than depending on a weak CLI |
| Base API URL | `https://my.clockodo.com/api` | Matches bundled OpenAPI server |
| Endpoint version strategy | Prefer current supported version per domain | Avoid starting new work on near-sunset endpoints |
| Auth validation endpoint | `/v4/users/me` | Supported identity probe in bundled spec |
| v1 product center | Stopwatch + entries | Highest value workflows |
| Write support in v1 | Entries only | Most useful and operationally safe enough |
| `entries today` | Yes | High-frequency convenience flow for humans |
| Framework | oclif | Consistent with prior approach and future growth |
| Config location | `~/.config/clockodo-cli/` | Standard and predictable |
| Raw escape hatch | Yes | Prevent wrapper lag from blocking usage |

---

## 18. Open Questions

- Do we need a legacy compatibility bridge for company/worktime context that is no longer bundled with `/v4/users/me`?
- Should `entries today` be a dedicated command, an alias to `entries list --today`, or both?
- What exact live response shapes does `/v2/clock` return for status, start, update, and stop once fixtures are captured?
- Which internal page abstraction should normalize both `{ paging, data }` and `{ paging, entries }` responses without hiding useful upstream differences?
