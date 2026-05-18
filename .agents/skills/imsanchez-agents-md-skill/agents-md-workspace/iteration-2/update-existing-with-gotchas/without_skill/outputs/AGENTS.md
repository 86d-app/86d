# Taskflow

A task management SaaS app.

## Architecture

- `src/routes/` — Express route handlers
- `src/models/` — Prisma models and queries
- `src/services/` — Business logic layer

## Tech stack

TypeScript, Express, Prisma (PostgreSQL), Redis, Vitest

## Gotchas

### Redis connection pool leaks in tests
The Redis client in `src/services/cache.ts` keeps an open connection pool. If you don't call `redis.quit()` in your test teardown (e.g., an `afterAll` hook), the pool leaks and **vitest will hang indefinitely** after tests pass. Always close the Redis connection when tearing down:

```ts
import { redis } from "@/services/cache";

afterAll(async () => {
  await redis.quit();
});
```

### `task_assignments` table has a DB trigger — don't insert directly
The `task_assignments` table has a PostgreSQL trigger that automatically syncs rows to the `search_index` table. If you bypass Prisma and write raw SQL inserts against `task_assignments`, the trigger may not fire as expected or you may miss the sync entirely. Always use the Prisma model for writes to `task_assignments` so the trigger executes correctly and the search index stays consistent.

## Development

### Build
npm run build

### Test
npm test
