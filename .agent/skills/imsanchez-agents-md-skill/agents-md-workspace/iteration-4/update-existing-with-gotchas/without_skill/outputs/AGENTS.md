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

- Always call `redis.quit()` in test teardown (e.g. `afterAll`) — the Redis
  connection pool from `src/services/cache.ts` leaks open handles if not
  explicitly closed, causing vitest to hang indefinitely after tests pass

## Database

- The `task_assignments` table has a PostgreSQL trigger that syncs rows to
  `search_index`. Direct SQL inserts/updates bypass this trigger — always use
  Prisma to write to `task_assignments` so the search index stays consistent

## Gotchas

### Vitest hangs after tests pass
The Redis connection pool in `src/services/cache.ts` leaks open handles if you
don't explicitly close it. Always call `redis.quit()` in your test teardown
(e.g. in an `afterAll` hook). Without this, vitest will hang indefinitely after
all tests pass because Node cannot exit with open connections.

### task_assignments table has a DB trigger
The `task_assignments` table has a PostgreSQL trigger that automatically syncs
rows to the `search_index` table. If you perform direct SQL inserts or updates
(e.g. raw SQL queries, migration scripts, or manual DB operations), the trigger
is bypassed and `search_index` will become stale. Always use Prisma to write to
`task_assignments` so the trigger fires and the search index stays consistent.
