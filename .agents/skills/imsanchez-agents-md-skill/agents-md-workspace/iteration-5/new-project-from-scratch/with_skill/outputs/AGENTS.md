# Inventory API

TypeScript REST API for inventory management. Express handles HTTP routing, Prisma manages PostgreSQL access, BullMQ processes background jobs via Redis, and Zod validates inputs at runtime.

## Architecture

```
src/
  api/            # Express HTTP server and route handlers
    index.ts      # Entrypoint -- mounts routers, listens on :3000
    routes/       # Route modules (inventory, webhooks)
  workers/        # BullMQ background job processors
    sync-worker.ts  # Syncs inventory changes to the warehouse system
  shared/         # Modules shared across API and workers
    redis.ts      # Singleton ioredis connection
    db.ts         # Singleton Prisma client
    seed.ts       # Database seed script
```

- **API routes** are mounted under `/api/` (`/api/inventory`, `/api/webhooks`).
- **Workers** consume jobs from Redis queues. The `inventory-sync` worker updates product quantities and writes audit logs inside a single Prisma transaction -- never split these into separate calls.
- **Shared modules** export singleton clients. Always import Redis from `src/shared/redis.ts`; never create additional connections.

## Setup

Prerequisites: Node.js (LTS), PostgreSQL, Redis (defaults to `redis://localhost:6379`).

```bash
npm install
npm run db:migrate && npm run db:seed
```

Environment variables:

| Variable       | Purpose                          | Default                  |
|----------------|----------------------------------|--------------------------|
| `REDIS_URL`    | Redis connection string          | `redis://localhost:6379` |
| `DATABASE_URL` | Prisma PostgreSQL connection URL | (see Prisma schema)      |

## Development

- `npm run dev` -- start dev server with hot reload (tsx watch, port 3000)
- `npm run build` -- compile TypeScript (tsc)
- `npm run lint` -- check with Biome (no separate ESLint/Prettier)
- `npm run lint:fix` -- auto-fix lint and format issues
- `npm run db:studio` -- open Prisma Studio to inspect data visually

## Testing

- `npm test` -- run Vitest in watch mode
- `npm run test:ci` -- single run with coverage

Place test files alongside source (`.test.ts` / `.spec.ts`) or in `__tests__/` directories.

**Critical:** Always call `redis.quit()` in test teardown. Open Redis connections cause Vitest to hang indefinitely.

## Common Tasks

- **New API route:** Create a router in `src/api/routes/`, mount it in `src/api/index.ts`.
- **New background job:** Add a worker in `src/workers/` following the pattern in `sync-worker.ts`.
- **Schema change:** Edit the Prisma schema, run `npm run db:migrate`, then restart the dev server so the regenerated Prisma client is picked up.
- **New shared utility:** Place it in `src/shared/` so both API and workers can import it.

## Gotchas

- The `inventory-sync` worker uses `prisma.$transaction` to atomically update products and write audit logs. Splitting these into separate calls risks inconsistent state.
- BullMQ workers and the API share the same Redis connection. If Redis goes down, both HTTP caching and job processing fail.
- After changing Prisma models, you must run `npm run db:migrate` **and** restart the dev server -- the generated client is stale until regenerated.
- Always run migrations before seeding: `npm run db:migrate && npm run db:seed`.
