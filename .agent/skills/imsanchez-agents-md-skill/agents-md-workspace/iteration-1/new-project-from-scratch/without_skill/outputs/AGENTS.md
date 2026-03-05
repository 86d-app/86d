# AGENTS.md

## Project Overview

**inventory-api** is a TypeScript backend service that provides an inventory management API with background job processing. It uses Express for HTTP routing, Prisma for database access, BullMQ for job queues, and Redis as the queue broker.

## Tech Stack

- **Language:** TypeScript 5.3+
- **Runtime:** Node.js (via tsx for development)
- **HTTP Framework:** Express 4
- **Database ORM:** Prisma 5
- **Job Queue:** BullMQ 5 (backed by Redis/ioredis)
- **Validation:** Zod 3
- **Testing:** Vitest
- **Linting/Formatting:** Biome

## Project Structure

```
src/
  api/
    index.ts          # Express app entry point (listens on port 3000)
    routes/            # Route modules (inventory, webhooks)
  workers/
    sync-worker.ts     # BullMQ worker that syncs inventory to the warehouse system
  shared/
    redis.ts           # Shared Redis connection (uses REDIS_URL env var)
    db.ts              # Shared Prisma client instance
    seed.ts            # Database seed script
```

### Key Entry Points

- **API server:** `src/api/index.ts` -- Express server exposing `/api/inventory` and `/api/webhooks` routes.
- **Background worker:** `src/workers/sync-worker.ts` -- BullMQ worker that processes the `inventory-sync` queue, updating product quantities and writing audit log entries inside a Prisma transaction.

## Build and Run

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start the API in development mode (with file watching)
npm run dev
```

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once with coverage (CI mode)
npm run test:ci
```

Tests use **Vitest**. Place test files next to their source files using the `.test.ts` or `.spec.ts` naming convention, or in a `__tests__` directory.

## Linting and Formatting

```bash
# Check for lint/format issues
npm run lint

# Auto-fix lint/format issues
npm run lint:fix
```

This project uses **Biome** (not ESLint/Prettier). Configuration lives in `biome.json` if present.

## Database

The project uses **Prisma** with a relational database. The schema is defined in `prisma/schema.prisma`.

```bash
# Run database migrations during development
npm run db:migrate

# Seed the database with test/initial data
npm run db:seed

# Open Prisma Studio (visual database browser)
npm run db:studio
```

## Environment Variables

- `REDIS_URL` -- Redis connection string (defaults to `redis://localhost:6379`)
- Database connection string is configured via Prisma (typically `DATABASE_URL` in `.env`)

## Conventions

- **Shared modules** live in `src/shared/` and are imported by both the API and workers.
- Route handlers are organized under `src/api/routes/` as separate Express Router modules.
- Background jobs are processed by workers in `src/workers/`.
- Database writes that span multiple tables use Prisma interactive transactions (`prisma.$transaction`).
- Input validation should use Zod schemas.
