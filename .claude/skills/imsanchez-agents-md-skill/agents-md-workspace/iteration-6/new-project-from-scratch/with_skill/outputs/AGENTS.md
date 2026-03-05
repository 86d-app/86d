# Inventory API

Express + TypeScript REST API for inventory management, backed by Prisma (Postgres), Redis, and BullMQ for async job processing.

## Project overview

- `src/api/` — Express HTTP server and route handlers (inventory CRUD, webhooks)
- `src/workers/` — BullMQ background workers (e.g., `sync-worker` syncs inventory changes to the warehouse system)
- `src/shared/` — Shared infrastructure: Redis connection, Prisma client, seed scripts

## Tech stack

- **Runtime**: Node.js with TypeScript (compiled via `tsc`, dev mode via `tsx`)
- **Framework**: Express
- **Database**: PostgreSQL via Prisma ORM
- **Queue**: BullMQ backed by Redis (ioredis)
- **Validation**: Zod for request/input schemas
- **Linting**: Biome (not ESLint)
- **Testing**: Vitest

## Development

```bash
npm run dev          # Start dev server with tsx watch (hot reload)
npm run build        # Compile TypeScript with tsc
npm run lint         # Check with Biome
npm run lint:fix     # Auto-fix lint issues with Biome
```

## Database

```bash
npm run db:migrate   # Run Prisma migrations (prisma migrate dev)
npm run db:seed      # Seed data via tsx src/shared/seed.ts
npm run db:studio    # Open Prisma Studio GUI
```

Always run `db:migrate` before `db:seed` — the seed script assumes the schema is up to date.

## Testing

```bash
npm run test         # Run Vitest in watch mode
npm run test:ci      # Single run with coverage
```

## Architecture notes

- The sync worker wraps all database writes in a Prisma `$transaction` — product updates and audit log entries are atomic. Maintain this pattern for any new workers that touch the database.
- Redis connection is centralized in `src/shared/redis.ts`. Import from there; do not create additional Redis instances.
- The API server listens on port 3000 by default.
- `REDIS_URL` env var configures the Redis connection (defaults to `redis://localhost:6379`).

## Conventions

- Use Biome for formatting and linting, not ESLint or Prettier.
- Use Zod schemas for runtime validation of API inputs.
- Background jobs go in `src/workers/` as standalone BullMQ worker files.
- Shared infrastructure (DB client, Redis, config) lives in `src/shared/`.
