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

The Redis client in `src/services/cache.ts` keeps an open connection pool. If you don't explicitly call `redis.quit()` in your test teardown (e.g., an `afterAll` hook), the pool leaks and **vitest will hang indefinitely** after tests pass. Always close the Redis connection in test cleanup:

```ts
import { redis } from "../src/services/cache";

afterAll(async () => {
  await redis.quit();
});
```

### task_assignments table has a DB trigger

The `task_assignments` table has a database trigger that automatically syncs rows to the `search_index` table. If you insert or update rows via direct SQL (e.g., raw queries, migration scripts, or seed scripts), the trigger is bypassed and the search index will be out of sync. Always use Prisma model methods for writes to `task_assignments` so the trigger fires correctly.
