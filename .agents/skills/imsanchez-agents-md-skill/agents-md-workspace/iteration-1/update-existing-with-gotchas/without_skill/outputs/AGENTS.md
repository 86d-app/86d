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

### Redis connection pool leaks in tests
The Redis client in `src/services/cache.ts` keeps an open connection pool. If you don't call `redis.quit()` in your test teardown (e.g., `afterAll`), vitest will hang indefinitely after tests pass. Always close the Redis connection when tests finish:
```ts
import { redis } from "@/services/cache";

afterAll(async () => {
  await redis.quit();
});
```

### task_assignments table has a DB trigger
The `task_assignments` table has a PostgreSQL trigger that automatically syncs rows to the `search_index` table. Direct SQL inserts (e.g., raw `INSERT INTO task_assignments`) bypass this trigger if run outside the normal Prisma flow. Always use the Prisma model methods to write to `task_assignments` so the trigger fires and `search_index` stays in sync.
