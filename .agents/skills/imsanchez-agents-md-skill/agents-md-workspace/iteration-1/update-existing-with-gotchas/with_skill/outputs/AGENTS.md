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

## Gotchas

- **Redis connection pool leak in tests**: Always call `redis.quit()` in your
  test teardown (e.g. `afterAll`). The ioredis connection pool stays open after
  tests finish, which causes vitest to hang indefinitely instead of exiting.
  See `src/services/cache.ts` for the shared Redis instance that must be
  cleaned up.

- **`task_assignments` table has a DB trigger**: This table has a PostgreSQL
  trigger that automatically syncs rows to the `search_index` table. Direct SQL
  inserts (e.g. raw `INSERT INTO task_assignments`) bypass the trigger's
  expected Prisma lifecycle — always use Prisma to write to this table so the
  search index stays consistent.
