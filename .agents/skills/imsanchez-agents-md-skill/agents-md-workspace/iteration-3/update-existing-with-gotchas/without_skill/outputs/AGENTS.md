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
The Redis client in `src/services/cache.ts` keeps an open connection pool. If you don't call `redis.quit()` in your test teardown (e.g., `afterAll`), the pool leaks and vitest hangs indefinitely after tests pass. Always close the connection in teardown:

```ts
import { redis } from "@/services/cache";

afterAll(async () => {
  await redis.quit();
});
```

### task_assignments table has a DB trigger
The `task_assignments` table has a PostgreSQL trigger that automatically syncs rows to the `search_index` table. Direct SQL inserts (e.g., raw `INSERT INTO task_assignments`) bypass this trigger's expected ORM lifecycle hooks. Always use Prisma to write to `task_assignments` so the trigger fires correctly and the search index stays in sync.
