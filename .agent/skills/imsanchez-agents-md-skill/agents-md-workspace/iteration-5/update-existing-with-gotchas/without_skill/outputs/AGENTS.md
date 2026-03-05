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
