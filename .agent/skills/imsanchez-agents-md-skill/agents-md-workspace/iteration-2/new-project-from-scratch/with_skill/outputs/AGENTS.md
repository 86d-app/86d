# Inventory API

REST API for inventory management with background sync to a warehouse management system.

## Architecture

- `src/api/` — Express HTTP server with route modules (`inventory`, `webhooks`). Entry point is `src/api/index.ts`, listens on port 3000.
- `src/workers/` — BullMQ background workers that process async jobs. `sync-worker.ts` syncs product quantity changes to the DB and writes audit logs in a single Prisma transaction.
- `src/shared/` — Shared modules used across API and workers: Prisma client (`db.ts`), Redis connection (`redis.ts`).

## Tech stack

TypeScript, Express, Prisma (PostgreSQL), ioredis, BullMQ, Zod, Vitest, Biome

## Build

```sh
npm run build        # tsc — compiles TypeScript
```

## Run locally

```sh
npm run dev          # tsx watch on src/api/index.ts — auto-restarts on changes
```

## Test

```sh
npm test             # vitest in watch mode
npm run test:ci      # vitest run --coverage (single run, CI-friendly)
```

## Lint

```sh
npm run lint         # biome check .
npm run lint:fix     # biome check --write . (auto-fix)
```

## Database

```sh
npm run db:migrate   # prisma migrate dev — apply schema changes
npm run db:seed      # tsx src/shared/seed.ts — seed dev data
npm run db:studio    # prisma studio — visual DB browser
```

Run migrations before seeding: `npm run db:migrate && npm run db:seed`.

## Conventions

- All database writes use Prisma transactions — the `auditLog` table is populated inside the same transaction as the data change to guarantee consistency
- Zod is the validation library for request body and job payload validation
- Redis connection is centralized in `src/shared/redis.ts` — import from there, never create new connections
- The shared Redis instance reads `REDIS_URL` from the environment, defaulting to `redis://localhost:6379`
- All API routes are mounted under `/api/` (e.g., `/api/inventory`, `/api/webhooks`)

## Gotchas

- Always call `redis.quit()` in test teardown — open connections cause Vitest to hang indefinitely
- The BullMQ workers share the same Redis connection as the API; if Redis is down, both the API cache and job processing fail
- `src/shared/db.ts` exports the Prisma client — if you add models, run `npm run db:migrate` then restart the dev server so the generated client updates
- The `inventory-sync` worker uses `prisma.$transaction` — do not call the update and audit log creation separately or you risk inconsistent state
