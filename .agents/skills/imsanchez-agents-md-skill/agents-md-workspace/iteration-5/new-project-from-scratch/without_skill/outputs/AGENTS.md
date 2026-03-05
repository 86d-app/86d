# AGENTS.md

## Project Overview

`inventory-api` is a TypeScript backend service for inventory management. It exposes a REST API via Express, uses Prisma as the ORM for database access, and processes background jobs with BullMQ backed by Redis. Input validation uses Zod.

## Tech Stack

- **Language:** TypeScript 5.3+
- **Runtime:** Node.js
- **Web framework:** Express 4
- **ORM:** Prisma 5 (`@prisma/client`)
- **Job queue:** BullMQ 5 with ioredis 5
- **Validation:** Zod 3
- **Linter/formatter:** Biome 1.5
- **Test framework:** Vitest 1.3
- **Dev runner:** tsx 4 (for watch mode and script execution)

## Build and Run

```bash
# Install dependencies
npm install

# Generate Prisma client (required before building or running)
npx prisma generate

# Build TypeScript to JavaScript
npm run build          # runs: tsc

# Run the API in development mode (with hot reload)
npm run dev            # runs: tsx watch src/api/index.ts

# The API listens on port 3000
```

## Database

```bash
# Run database migrations
npm run db:migrate     # runs: prisma migrate dev

# Seed the database
npm run db:seed        # runs: tsx src/shared/seed.ts

# Open Prisma Studio (visual DB browser)
npm run db:studio      # runs: prisma studio
```

Prisma is the sole database access layer. All schema changes must go through Prisma migrations. The Prisma schema file is at `prisma/schema.prisma`. After modifying the schema, run `npm run db:migrate` to create and apply a migration.

## Testing

```bash
# Run tests in watch mode
npm test               # runs: vitest

# Run tests once with coverage (CI mode)
npm run test:ci        # runs: vitest run --coverage
```

Tests use Vitest. Always run `npm test` (or `npm run test:ci`) before committing to verify nothing is broken.

## Linting and Formatting

```bash
# Check for lint and formatting issues
npm run lint           # runs: biome check .

# Auto-fix lint and formatting issues
npm run lint:fix       # runs: biome check --write .
```

This project uses Biome (not ESLint/Prettier). Run `npm run lint` before committing. Use `npm run lint:fix` to auto-fix issues.

## Project Structure

```
src/
  api/              # Express HTTP layer
    index.ts        # App entrypoint -- creates Express app, mounts routers, starts server on :3000
    routes/         # Route modules (e.g., inventory, webhooks)
  workers/          # BullMQ background job workers
    sync-worker.ts  # Syncs inventory changes to warehouse; uses Prisma transactions
  shared/           # Shared utilities used across API and workers
    redis.ts        # Shared Redis (ioredis) connection instance
    db.ts           # Shared Prisma client instance
    seed.ts         # Database seed script
```

### Key architectural boundaries

- **`src/api/`** -- HTTP request handling only. Route handlers live under `routes/`. The entrypoint (`index.ts`) mounts route modules on Express and starts the server.
- **`src/workers/`** -- Background job processors. Each worker file exports a BullMQ `Worker` instance. Workers consume jobs from named queues and perform database operations.
- **`src/shared/`** -- Code shared between the API and workers. This includes the Redis connection (`redis.ts`), the Prisma client (`db.ts`), and the database seed script. Do not put HTTP or job-specific logic here.

## Environment Variables

- `REDIS_URL` -- Redis connection string. Defaults to `redis://localhost:6379` if not set.
- `DATABASE_URL` -- Prisma database connection string (required by Prisma; set in `.env` or environment).

## Conventions

- **Database access:** Always use Prisma. Do not write raw SQL unless there is no Prisma equivalent. Use Prisma transactions (`prisma.$transaction`) when multiple writes must be atomic (see `sync-worker.ts` for an example).
- **Validation:** Use Zod schemas to validate all external input (request bodies, job payloads).
- **New API routes:** Create a new router file under `src/api/routes/` and mount it in `src/api/index.ts`.
- **New background jobs:** Create a new worker file under `src/workers/`. Import the shared Redis connection from `src/shared/redis.ts` and the Prisma client from `src/shared/db.ts`.
- **Shared code:** Place reusable utilities in `src/shared/`. Keep this module free of HTTP or queue-specific dependencies.
- **Formatting:** Biome handles both linting and formatting. Do not add ESLint or Prettier configs.
