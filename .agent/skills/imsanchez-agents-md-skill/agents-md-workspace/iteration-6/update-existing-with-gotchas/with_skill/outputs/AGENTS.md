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

- **Redis connection pool leaks in tests.** Vitest will hang indefinitely after tests pass if you don't call `redis.quit()` in your test teardown (e.g., `afterAll`). The pool keeps Node's event loop alive. See `src/services/cache.ts` for the shared Redis instance.
- **`task_assignments` table has a DB trigger that syncs to `search_index`.** Direct SQL inserts/updates bypass it — always go through Prisma so the trigger fires and the search index stays consistent.
