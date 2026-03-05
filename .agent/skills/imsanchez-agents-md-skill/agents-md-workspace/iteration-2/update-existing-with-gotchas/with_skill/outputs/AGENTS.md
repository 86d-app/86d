# Taskflow

A task management SaaS app.

## Architecture

- `src/routes/` — Express route handlers
- `src/models/` — Prisma models and queries
- `src/services/` — Business logic layer

## Tech stack

TypeScript, Express, Prisma (PostgreSQL), Redis, Vitest

## Development

### Build
npm run build

### Test
npm test

- Always call `redis.quit()` in test teardown (`afterAll` / `afterEach`) —
  the Redis connection pool leaks open handles and causes vitest to hang
  indefinitely after tests pass

## Gotchas

- **Redis connection cleanup**: Every test file that imports `redis` from
  `src/services/cache.ts` must call `redis.quit()` in its teardown hook.
  Skipping this causes vitest to hang after all tests pass with no error
  output, making it look like the suite is stuck. If vitest hangs, check
  for missing `redis.quit()` calls first.

- **task_assignments table trigger**: The `task_assignments` table has a
  database trigger that syncs rows to `search_index`. Direct SQL inserts
  (raw queries, migrations with data, seed scripts) bypass this trigger.
  Always use Prisma to write to `task_assignments` so the search index
  stays in sync.
