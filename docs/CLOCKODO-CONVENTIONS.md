# CLOCKODO-CONVENTIONS.md — Clockodo CLI Coding Conventions

**Read this file before writing any code.** This defines the patterns every contributor must follow. Use `entries` as the gold-standard CRUD domain and `clock` as the gold-standard action domain.

---

## 1. Project Structure Rules

```text
README.md
docs/
src/
  index.ts
  commands/<domain>/<action>.ts
  core/
  services/clockodo/
  types/
tests/
  unit/
  integration/
  fixtures/api-responses/
```

**Rules:**

- root `README.md` explains repo purpose and source-of-truth ordering
- `docs/openapi.yaml` is the source of truth for endpoint versions and response envelopes
- every new domain gets its own folder under `commands/`
- every API-backed domain gets its own service file under `services/clockodo/`
- never put business logic in commands
- never call HTTP directly outside `core/http/client.ts`
- never read/write config outside `core/config/` and `core/auth/`
- never import one command from another command
- services may import from `core/`, never from `commands/`

---

## 2. File Naming

- filenames: `kebab-case.ts`
- test files: `<module>.test.ts`
- fixture files: `kebab-case.json`
- prefer one main export per file
- `index.ts` only for re-exports, not logic

---

## 3. Import Ordering

Use this order with blank lines between groups:

```ts
// 1. Node built-ins
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// 2. External packages
import { Command, Flags } from '@oclif/core'
import { z } from 'zod'

// 3. Core modules
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { handleError } from '../../core/errors/error-handler.js'

// 4. Services
import { EntriesService } from '../../services/clockodo/entries.js'

// 5. Types (type-only)
import type { Entry } from '../../types/api-responses.js'
```

**Rules:**

- always use `node:` for built-ins
- always use `.js` in relative imports
- use `import type` for type-only imports

---

## 4. Command Pattern

Every command follows the same boring, blessed, non-cursed pattern.

```ts
import { Command, Flags } from '@oclif/core'
import { getClockodoCredentials } from '../../core/auth/auth-manager.js'
import { createClockodoClient } from '../../core/http/client.js'
import { outputResult } from '../../core/output/writer.js'
import { handleError } from '../../core/errors/error-handler.js'
import { EntriesService } from '../../services/clockodo/entries.js'

export default class EntriesList extends Command {
  static override description = 'List time entries'

  static override examples = [
    '<%= config.bin %> entries list',
    '<%= config.bin %> entries list --today',
    '<%= config.bin %> entries list --json --user 12',
  ]

  static override flags = {
    json: Flags.boolean({ description: 'Output as JSON' }),
    today: Flags.boolean({ description: 'Show only today\'s entries' }),
    user: Flags.integer({ description: 'Filter by user ID' }),
    debug: Flags.boolean({ description: 'Enable debug output', env: 'CLOCKODO_DEBUG' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(EntriesList)

    try {
      const credentials = await getClockodoCredentials(flags)
      const client = createClockodoClient(credentials, { debug: flags.debug })
      const service = new EntriesService(client)

      const result = await service.list({
        today: flags.today,
        userId: flags.user,
      })

      outputResult(result, {
        json: flags.json,
        columns: ['id', 'time_since', 'time_until', 'customers_id', 'projects_id', 'services_id', 'text'],
        title: 'Entries',
      })
    } catch (error) {
      handleError(error, flags.json)
    }
  }
}
```

**Rules:**

- class name is `<Domain><Action>` in PascalCase
- every command includes `description`, `examples`, and `flags`
- include at least 2 examples
- `run()` follows parse → creds → client → service → output
- no API logic in commands
- no schema validation logic in commands
- no `console.log` or `console.error`

---

## 5. Service Pattern

Services encapsulate all Clockodo API interaction for one domain.

```ts
import { z } from 'zod'
import type { ClockodoHttpClient } from '../../core/http/client.js'

export const EntrySchema = z.object({
  id: z.number(),
  customers_id: z.number(),
  projects_id: z.number().nullable().optional(),
  services_id: z.number().nullable().optional(),
  lumpsum_services_id: z.number().nullable().optional(),
  users_id: z.number().nullable().optional(),
  billable: z.boolean().optional(),
  text: z.string().nullable().optional(),
  time_since: z.string(),
  time_until: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
})

export type Entry = z.infer<typeof EntrySchema>

export interface EntryListOptions {
  readonly today?: boolean
  readonly userId?: number
}

export class EntriesService {
  constructor(private readonly client: ClockodoHttpClient) {}

  async list(options: EntryListOptions = {}): Promise<Entry[]> {
    const params: Record<string, string | number> = {}

    if (options.userId) params.users_id = options.userId

    const response = await this.client.fetch<{ entries: Entry[] }>('/v2/entries', {
      params,
      schema: z.object({ entries: z.array(EntrySchema) }),
    })

    return response.entries
  }

  async get(id: number): Promise<Entry> {
    const response = await this.client.fetch<{ entry: Entry }>(`/v2/entries/${id}`, {
      schema: z.object({ entry: EntrySchema }),
    })

    return response.entry
  }
}
```

**Rules:**

- one service class per domain
- Zod schemas live at the top of the service file
- export schema and inferred type
- service methods receive typed option objects
- service methods return typed results, not raw unknown blobs
- use wrapper schemas that match the real endpoint version, for example `{ entry: ... }`, `{ entries: ... }`, or `{ data: ... }`
- service methods may normalize CLI-friendly options into required API parameters, but that translation must live in shared helpers or service code rather than command handlers
- private helpers for payload builders and query translation

---

## 6. Error Handling Pattern

In commands, wrap all logic in try/catch and delegate to `handleError`.

In services, throw typed errors and let them propagate.

**Rules:**

- never use `process.exit()` directly
- never swallow errors silently
- error messages must tell the user what happened and what to do next

Suggested custom errors:

- `AuthError`
- `ValidationError`
- `NotFoundError`
- `RateLimitError`
- `ApiError`
- `NetworkError`
- `ConfigurationError`

---

## 7. Output Pattern

Two modes only: human and JSON.

```ts
outputResult(data, {
  json: flags.json,
  columns: ['id', 'name'],
  title: 'Customers',
})
```

**Rules:**

- stdout is for result data only
- stderr is for warnings, errors, debug, progress
- JSON mode must emit valid JSON and nothing else on stdout
- normalize upstream API wrappers into the stable CLI JSON envelope instead of leaking raw Clockodo response envelopes
- success envelope:

```json
{ "data": [...] }
```

or

```json
{ "data": { ... } }
```

- never use `console.log` or `console.error`

---

## 8. Zod Schema Conventions

Zod schemas are the source of truth for response shapes.

```ts
export const CustomerSchema = z.object({
  id: z.number(),
  name: z.string(),
  number: z.string().nullable().optional(),
  active: z.boolean().optional(),
  billable_default: z.boolean().optional(),
  note: z.string().nullable().optional(),
})

export type Customer = z.infer<typeof CustomerSchema>
```

**Rules:**

- schema naming: `<Entity>Schema`
- create/update payload schemas: `<Entity>CreateSchema`, `<Entity>UpdateSchema`
- use `.nullable()` when the API returns null
- use `.optional()` only when a field may be absent
- do not add speculative fields just because they seem plausible
- validate wrapper envelopes too, not only inner entities

---

## 9. HTTP Client Conventions

All network traffic goes through one shared Clockodo HTTP client.

**Rules:**

- never construct full URLs in services
- default client base URL is `https://my.clockodo.com/api`
- always pass versioned paths like `/v2/entries`, `/v3/customers`, or `/v4/projects`
- the client injects:
  - `X-ClockodoApiUser`
  - `X-ClockodoApiKey`
  - `X-Clockodo-External-Application`
  - `Accept: application/json`
- the client centralizes retries and debug logging
- the client should support both form-style and JSON body encoding, selected explicitly per request
- do not duplicate retry logic in services

---

## 10. Testing Conventions

### Must test for every new domain

- happy path for each service method
- not-found behavior
- validation behavior
- JSON output contract
- command flag parsing to service options
- envelope normalization where upstream API versions differ

### Fixtures

- store recorded API responses under `tests/fixtures/api-responses/<domain>/`
- use real responses, anonymized if necessary
- record fixtures before finalizing schemas

### Rules

- never hit live APIs in unit tests
- integration tests should still use fixtures/mocks in CI
- test behavior, not implementation trivia

---

## 11. Flag Conventions

Standard shared flags:

| Flag | Type | Notes |
|------|------|-------|
| `--json` | boolean | every command supports it |
| `--debug` | boolean | also via `CLOCKODO_DEBUG` |
| `--profile` | string | active profile override |
| `--yes` | boolean | confirmation bypass |
| `--no-interactive` | boolean | disable prompts |

Domain-specific flags should stay predictable:

- foreign keys use singular names: `--customer`, `--project`, `--service`, `--user`
- dates: `--from`, `--to`, `--since`, `--until`
- entry text: `--text`
- if the upstream endpoint requires concrete date ranges, human-friendly flags such as `--today` must resolve to explicit request parameters before the HTTP call is made

For clock commands:

```text
clockodo clock in --customer 1 --service 2 --project 3 --text "Standup"
clockodo clock switch --customer 4 --service 9 --text "Migration"
```

---

## 12. TypeScript Conventions

- `strict: true`
- no `any` unless unavoidable and commented
- prefer `unknown` to `any`
- explicit return types on public/exported functions
- use `interface` for object shapes, `type` for unions and inferred aliases
- use string literal unions instead of enums
- use `readonly` where mutation is not intended

---

## 13. Naming Conventions Summary

| Thing | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `auth-manager.ts` |
| Classes | PascalCase | `ClockService` |
| Interfaces | PascalCase | `EntryListOptions` |
| Types | PascalCase | `Entry` |
| Schemas | PascalCase + Schema | `EntrySchema` |
| Functions | camelCase | `getClockodoCredentials` |
| Flags | kebab-case | `--no-interactive` |
| Commands | lowercase noun | `entries`, `customers` |
| Subcommands | lowercase verb | `list`, `get`, `update` |

---

## 14. Adding a New Domain — Checklist

1. record live API fixtures
2. create Zod schemas from fixture reality
3. implement service methods
4. write service unit tests
5. create command files
6. write integration tests
7. define human-table columns
8. test manually against a real Clockodo account
9. update README

Do not skip fixture collection. Guessing schemas from doc prose is how software becomes cursed pottery.

---

## 15. Things That Will Get Code Rejected

- business logic in command files
- direct HTTP outside the shared client
- `console.log` / `console.error`
- `process.exit()`
- missing tests for new commands/services
- speculative schemas not backed by fixtures
- mixing `clock` behavior with `entries` CRUD in one service
- JSON output that is not stable or clean
- command/flag naming drift from established patterns
