# CLOCKODO-API-REFERENCE.md — Offline API Reference for Coding Agents

**Purpose:** This document provides the Clockodo API details needed to implement the Clockodo CLI without requiring web access. It is grounded first in the bundled `docs/openapi.yaml` document and second in the legacy Clockodo endpoint pages that still help explain behavior.

**Important:** The bundled OpenAPI document is dated 2026-03-12 and includes migration guidance for several legacy endpoints by 2026-05-01. New CLI work should prefer the current supported endpoint family for each domain rather than starting from deprecated paths. Response shapes documented here are still best-effort and **must** be validated against live API responses before being used as Zod schemas.

---

## 1. API Basics

### Base URL

```text
https://my.clockodo.com/api
```

Operational endpoints for a CLI currently live under mixed `/v2/...`, `/v3/...`, and `/v4/...` families.

### Authentication

Clockodo supports either HTTP Basic auth or dedicated request headers. For a CLI, header-based auth is cleaner and easier to debug.

### Required Headers (every request)

```text
X-ClockodoApiUser: <email address>
X-ClockodoApiKey: <api key>
X-Clockodo-External-Application: <app name>;<contact email>
Accept: application/json
```

`X-Clockodo-External-Application` is mandatory in the official examples and identifies the calling application.

### Optional Headers

```text
Content-Type: application/x-www-form-urlencoded
Content-Type: application/json
```

The legacy examples commonly submit POST/PUT bodies as form data. A CLI should support both form-style submissions and JSON where the live endpoint accepts it, but must verify against real responses.

### Authentication Strategy for the CLI

Store these values per profile:

- API user email
- API key
- external application name
- external application contact email
- optional base URL override (defaults to `https://my.clockodo.com/api`)
- optional locale override for `Accept-Language`

### Identity / “Who am I?” Probe

Use this endpoint to validate configuration and identify the current user:

```text
GET /v4/users/me
```

Response includes:

- `data`

Use the legacy aggregate endpoint only as a temporary bridge when company/worktime defaults are required and no supported replacement exists:

```text
GET /v2/aggregates/users/me
```

This should be the canonical auth-validation strategy for the CLI:

- primary validation: `GET /v4/users/me`
- optional legacy enrichment: `GET /v2/aggregates/users/me`

---

## 2. Resource Patterns

Clockodo follows a regular REST shape, but response wrappers vary by version family:

- `GET /vX/<resource>` — list
- `GET /vX/<resource>/<id>` — get single
- `POST /vX/<resource>` — create
- `PUT /vX/<resource>/<id>` — update
- `DELETE /vX/<resource>/<id>` — delete

Current `v3` and `v4` endpoints commonly return:

```json
{ "paging": { "...": "..." }, "data": [ ... ] }
```

```json
{ "data": { ... } }
```

Current `v2` entry endpoints commonly return:

```json
{ "paging": { "...": "..." }, "entries": [ ... ] }
```

```json
{ "entry": { ... } }
```

Deletion commonly returns:

```json
{ "success": true }
```

---

## 3. Core Domains Relevant for a CLI

The most useful CLI-facing domains are:

- `clock` — running stopwatch control
- `entries` — time entries and lump-sum entries
- `entrygroups` — multiple time entries in one operation
- `entriesTexts` — reusable descriptions
- `customers` — customers
- `projects` — projects
- `services` — services
- `lumpsumservices` — lump-sum service catalog
- `users` — coworkers
- `teams` — teams
- `users/me` — current user identity
- `workTimes` — work time records
- `workTimes/changeRequests` — work time change requests
- optional later: absences, holidays, target hours, overtime carry, surcharge models

For v1, the command surface should center on `clock`, `entries`, `customers`, `projects`, `services`, `users`, and `me`.

Recommended version strategy:

- `clock` → `/v2/clock`
- `entries` → `/v2/entries`
- `customers` → `/v3/customers`
- `projects` → `/v4/projects`
- `services` → `/v4/services`
- `users` → `/v3/users`
- `me` → `/v4/users/me`

---

## 4. Auth / Identity Endpoints

### Primary identity endpoint

```text
GET /v4/users/me
```

### Response envelope

```json
{
  "data": { "...": "..." }
}
```

### Legacy aggregate bridge

```text
GET /v2/aggregates/users/me
```

The bundled spec marks this endpoint deprecated, but it is still the richest single source for:

- company timezone defaults
- company module flags
- worktime regulation context

### Legacy aggregate response envelope

```json
{
  "user": { "...": "..." },
  "company": { "...": "..." },
  "worktime_regulation": { "...": "..." }
}
```

### Notable legacy aggregate fields

- `company.timezone_default`
- `company.currency`
- `company.default_customers_id`
- `company.default_services_id`
- `company.module_absence`
- `company.module_work_time`
- `company.module_target_hours`
- `worktime_regulation.add_to_worktime`
- `worktime_regulation.weekly_max`
- `worktime_regulation.daily_max`
- `worktime_regulation.interval_max`

Use `GET /v4/users/me` for authentication. Reach for the legacy aggregate only if a supported endpoint cannot provide the extra context you need.

---

## 5. Stopwatch / Running Clock

### Endpoints

```text
GET    /v2/clock
POST   /v2/clock
PUT    /v2/clock/{id}
DELETE /v2/clock/{id}
```

### Intended use

Control the currently running stopwatch and inspect its state.

### CLI relevance

This is the killer feature for a Clockodo CLI. It enables:

- `clockodo clock status`
- `clockodo clock in`
- `clockodo clock out`
- `clockodo clock switch`

### Expected implementation notes

The bundled spec answers some important implementation questions already:

- `POST /v2/clock` starts the running clock and requires `customers_id` and `services_id`
- `PUT /v2/clock/{id}` changes timing fields on the running clock
- `DELETE /v2/clock/{id}` stops the running clock
- `clock out` therefore needs the current running entry ID from `GET /v2/clock`

Design the CLI so clock-related service methods are isolated from normal entry CRUD because the stopwatch API is behaviorally distinct.

---

## 6. Customers API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v3/customers` | List customers |
| GET | `/v3/customers/{id}` | Get customer |
| POST | `/v3/customers` | Create customer |
| PUT | `/v3/customers/{id}` | Update customer |
| DELETE | `/v3/customers/{id}` | Delete customer |

### Create customer

Required parameters:

- `name`

Optional parameters:

- `active`
- `bill_service_id`
- `number`
- `billable_default`
- `color`
- `note`
- `service_assignments`

### Response envelopes

```json
{ "paging": { ... }, "data": [ ... ] }
```

```json
{ "data": { ... } }
```

### Likely core fields to validate from fixtures

- `id`
- `name`
- `number`
- `active`
- `billable_default`
- `note`
- `color`

---

## 7. Projects API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v4/projects` | List projects |
| GET | `/v4/projects/{id}` | Get project |
| POST | `/v4/projects` | Create project |
| PUT | `/v4/projects/{id}` | Update project |
| DELETE | `/v4/projects/{id}` | Delete project |

### Create project

Required parameters:

- `name`
- `customers_id`

Optional parameters:

- `number`
- `active`
- `billable_default`
- `budget`
- `note`
- `deadline`
- `start_date`
- `automatic_completion`
- `service_assignments`
- `bill_service_id`

### Update project extra fields

Current endpoints also expose update/complete concepts such as:

- `completed`

### Response envelopes

```json
{ "paging": { ... }, "data": [ ... ] }
```

```json
{ "data": { ... } }
```

### Likely core fields to validate from fixtures

- `id`
- `name`
- `customers_id`
- `number`
- `active`
- `billable_default`
- `deadline`
- `start_date`
- `completed`
- `note`
- `budget`

---

## 8. Services API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v4/services` | List services |
| GET | `/v4/services/{id}` | Get service |
| POST | `/v4/services` | Create service |
| PUT | `/v4/services/{id}` | Update service |
| DELETE | `/v4/services/{id}` | Delete service |

### Create service

Required parameters:

- `name`

Optional parameters:

- `number`
- `active`
- `note`
- `bill_service_id`

### Response envelopes

```json
{ "paging": { ... }, "data": [ ... ] }
```

```json
{ "data": { ... } }
```

### Likely core fields to validate from fixtures

- `id`
- `name`
- `number`
- `active`
- `note`

---

## 9. Entries API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v2/entries` | List entries |
| GET | `/v2/entries/{id}` | Get entry |
| POST | `/v2/entries` | Create entry |
| PUT | `/v2/entries/{id}` | Update entry |
| DELETE | `/v2/entries/{id}` | Delete entry |

### List requirements

The bundled spec makes `time_since` and `time_until` required for `GET /v2/entries`.

This means the CLI should expose a friendly convenience layer such as:

- `entries today`
- `entries list --since <iso> --until <iso>`
- `entries list --today`

### Entry creation modes

Clockodo documents three entry types. The current OpenAPI schema exposes one flexible create payload, but the CLI should still model these three modes explicitly to prevent invalid field combinations.

#### Type 1: Time entry
Required parameters:

- `customers_id`
- `services_id`
- `billable`
- `time_since`
- `time_until`

Optional parameters:

- `users_id`
- `duration`
- `hourly_rate`
- `projects_id`
- `text`

#### Type 2: Lump-sum value
Required parameters:

- `customers_id`
- `services_id`
- `lumpsum`
- `billable`
- `time_since`

Optional parameters:

- `users_id`
- `projects_id`
- `text`

#### Type 3: Entry with lump-sum service
Required parameters:

- `customers_id`
- `lumpsum_services_id`
- `lumpsum_services_amount`
- `billable`
- `time_since`

Optional parameters:

- `users_id`
- `projects_id`
- `text`

### Entry update parameters

Optional parameters include:

- `customers_id`
- `projects_id`
- `services_id`
- `lumpsum_services_id`
- `users_id`
- `billable`
- `text`
- `duration`
- `lumpsum`
- `lumpsum_services_amount`
- `hourly_rate`
- `time_since`
- `time_until`

### Response envelopes

```json
{ "paging": { ... }, "entries": [ ... ] }
```

```json
{ "entry": { ... } }
```

### Likely core fields to validate from fixtures

- `id`
- `customers_id`
- `projects_id`
- `services_id`
- `lumpsum_services_id`
- `users_id`
- `billable`
- `text`
- `time_since`
- `time_until`
- `duration`
- `hourly_rate`
- `lumpsum`

### CLI note

Entries should be the gold-standard CRUD domain for the Clockodo CLI, while `clock` should be the gold-standard action domain.

---

## 10. Entry Groups API

### Endpoint

```text
/v2/entrygroups
```

### Intended use

Manage multiple entries together.

### CLI relevance

Useful later for bulk import or bulk split workflows, but not necessary for v1. Keep it as a phase-4 or phase-5 expansion path.

---

## 11. Entry Texts API

### Endpoint

```text
/v3/entriesTexts
```

### Intended use

Query descriptions for time and lump-sum entries.

### CLI relevance

Useful for:

- `clockodo entries text-suggestions`
- shell completion / fuzzy helper commands
- detecting recent descriptions for fast clock-in

This is a nice v2 quality-of-life feature, not essential for the first shipping CLI.

---

## 12. Users API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v3/users` | List coworkers |
| GET | `/v3/users/{id}` | Get coworker |
| POST | `/v3/users` | Create coworker |
| PUT | `/v3/users/{id}` | Update coworker |
| DELETE | `/v3/users/{id}` | Delete coworker |

### Response envelopes

```json
{ "paging": { ... }, "data": [ ... ] }
```

```json
{ "data": { ... } }
```

### CLI relevance

Mostly read-only for v1:

- `clockodo users list`
- `clockodo users get <id>`
- resolving `users_id` for multi-user accounts

---

## 13. Teams API

### Endpoint

```text
/v3/teams
```

### CLI relevance

Secondary. Useful mainly in larger organizations. Keep out of the initial narrow scope unless team-aware filtering becomes necessary.

---

## 14. Work Time APIs

### Endpoints

- `/v2/workTimes`
- `/v2/workTimes/changeRequests`

### CLI relevance

These are not the same thing as time entries. They represent working-time tracking and change requests. This deserves a separate command group later, likely `worktime`, to avoid mixing accounting-style time entries with attendance-style work time records.

---

## 15. Absence / Holiday / Overtime Domains

Clockodo exposes additional domains including:

- `/v4/absences`
- `/v3/holidaysCarry`
- `/v2/holidaysQuota`
- `/v3/overtimeCarry`
- `/v2/targethours`
- `/v2/nonbusinessDays`
- `/v2/nonbusinessGroups`
- `/v3/usersNonbusinessGroups`

These are powerful but not necessary for a first CLI release. They should be phase-gated so the CLI does not mutate into a terminal hydra.

---

## 16. Pagination, Filtering, and Query Parameters

The bundled spec shows a strong pattern for current list endpoints:

- current `v3` and `v4` list endpoints typically return `{ paging, data }`
- `v2` entries returns `{ paging, entries }`
- pagination keys are commonly `items_per_page`, `current_page`, `count_pages`, and `count_items`
- filter vocabularies are still endpoint-specific even when paging shape is similar

Implementation guidance:

- normalize pagination in one shared helper
- keep endpoint-specific filter builders in services
- expose additive CLI flags such as `--page`, `--limit`, `--active`, `--user`, and date-range filters where the endpoint supports them

---

## 17. Error Responses

The legacy docs prominently show success payloads and parameter contracts, but do not provide one canonical shared error schema on the pages used for this reference. Therefore:

- treat error body structure as unstable until captured from live fixtures
- rely first on HTTP status code classification
- preserve raw API error payloads in `--debug` mode
- normalize into CLI-specific error envelopes for human and JSON output

### Minimum CLI error mapping

| HTTP status | Meaning |
|-------------|---------|
| 400 | Bad request / validation error |
| 401 | Authentication failed |
| 403 | Permission denied |
| 404 | Resource not found |
| 422 | Validation-ish semantic failure if returned |
| 429 | Rate limited |
| 500+ | API/server error |

---

## 18. Recommended CLI Domain Mapping

A sensible v1 command set:

```text
clockodo auth login
clockodo auth status
clockodo auth logout
clockodo me
clockodo clock status
clockodo clock in
clockodo clock out
clockodo clock switch
clockodo customers list
clockodo customers get
clockodo projects list
clockodo projects get
clockodo services list
clockodo services get
clockodo users list
clockodo users get
clockodo entries list
clockodo entries today
clockodo entries get
clockodo entries add
clockodo entries update
clockodo entries delete
clockodo raw
```

A sensible v2 expansion:

```text
clockodo entries text-suggestions
clockodo worktime status
clockodo worktime list
clockodo entrygroups import
```

---

## 19. Field Naming Gotchas

Things likely to bite implementation:

- Clockodo uses foreign-key style names like `customers_id`, `projects_id`, `services_id`, `users_id`.
- Create and update docs often describe **form parameters**, not formal JSON schemas.
- Current `v3` and `v4` endpoints usually wrap resources in `data`, not in domain-specific envelope keys.
- Entry creation has **three different modes** with different required fields.
- `GET /v2/entries` requires `time_since` and `time_until`.
- The running stopwatch (`clock`) is conceptually separate from normal entry CRUD.
- `clock out` is not `DELETE /v2/clock`; it is `DELETE /v2/clock/{id}` after discovering the running entry.
- `GET /v4/users/me` should be the default auth validation endpoint.
- Work time tracking and time entries are related but distinct; keep command groups separate.
- The docs expose an OpenAPI document in the newer portal; use the bundled `docs/openapi.yaml` as the primary offline source of truth.

---

## 20. Quick Reference — Endpoint Cheat Sheet

```text
# Auth / identity
GET    /v4/users/me
GET    /v2/aggregates/users/me   # legacy bridge only if needed

# Stopwatch
GET    /v2/clock
POST   /v2/clock
PUT    /v2/clock/{id}
DELETE /v2/clock/{id}

# Customers
GET    /v3/customers
GET    /v3/customers/{id}
POST   /v3/customers
PUT    /v3/customers/{id}
DELETE /v3/customers/{id}

# Projects
GET    /v4/projects
GET    /v4/projects/{id}
POST   /v4/projects
PUT    /v4/projects/{id}
DELETE /v4/projects/{id}

# Services
GET    /v4/services
GET    /v4/services/{id}
POST   /v4/services
PUT    /v4/services/{id}
DELETE /v4/services/{id}

# Entries
GET    /v2/entries
GET    /v2/entries/{id}
POST   /v2/entries
PUT    /v2/entries/{id}
DELETE /v2/entries/{id}

# Users
GET    /v3/users
GET    /v3/users/{id}
POST   /v3/users
PUT    /v3/users/{id}
DELETE /v3/users/{id}
```

---

## 21. Data Source Disclaimer

This document was compiled from:

1. The bundled `docs/openapi.yaml` document
2. Official Clockodo API basics and legacy endpoint pages
3. The previously prepared Bexio CLI API reference as a template for structure and developer ergonomics

**Response field lists are approximate unless confirmed from live fixtures.**

**Always validate against live API responses before committing Zod schemas.**
