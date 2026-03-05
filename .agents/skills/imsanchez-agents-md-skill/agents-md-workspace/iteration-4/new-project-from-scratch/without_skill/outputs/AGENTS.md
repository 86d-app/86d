# AGENTS.md

## Project Overview

Inventory API -- a TypeScript backend service that manages product inventory with real-time synchronization to a warehouse management system. Built on Express, Prisma (database ORM), BullMQ (job queues), and Redis.

## Build & Run

### Prerequisites

- Node.js (latest LTS recommended)
- Redis running locally or accessible via `REDIS_URL` environment variable (defaults to `redis://localhost:6379`)
- A database supported by Prisma (PostgreSQL assumed; check `prisma/schema.prisma` for the actual provider)

### Install Dependencies

```
npm install
```

### Database Setup

```
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed the database with initial data
```

### Start Development Server

```
npm run dev
```

This starts the Express API on port 3000 using `tsx watch` for live reloading.

### Build for Production

```
npm run build
```

Compiles TypeScript via `tsc`. Output location is determined by `tsconfig.json` (add one if missing).

## Testing

```
npm test             # Run tests in watch mode via Vitest
npm run test:ci      # Run tests once with coverage (for CI)
```

Tests use Vitest. Place test files next to source files using the `*.test.ts` or `*.spec.ts` naming convention, or in a `__tests__/` directory.

## Linting & Formatting

```
npm run lint         # Check for lint/format issues (Biome)
npm run lint:fix     # Auto-fix lint/format issues
```

This project uses Biome (not ESLint/Prettier). Run `lint:fix` before committing.

## Codebase Structure

```
src/
  api/            # Express HTTP layer
    index.ts      # App entry point, mounts route modules on /api/*
    routes/       # Route handlers (inventory, webhooks)
  workers/        # BullMQ background job processors
    sync-worker.ts  # Syncs inventory changes to warehouse via Prisma transactions
  shared/         # Code shared across API and workers
    redis.ts      # Shared Redis connection (ioredis)
    db.ts         # Shared Prisma client instance
    seed.ts       # Database seed script
```

### Key Architectural Decisions

- **API and workers are separate concerns.** The Express API handles HTTP requests; BullMQ workers process async jobs. Both share the same database and Redis connection through `src/shared/`.
- **Prisma transactions for data integrity.** The sync worker wraps inventory updates and audit log creation in a `$transaction` to ensure atomicity.
- **Redis serves dual purpose.** It backs both BullMQ job queues and can be used for caching.
- **Zod for runtime validation.** Request payloads should be validated using Zod schemas before processing.

## Environment Variables

| Variable    | Purpose                  | Default                  |
|-------------|--------------------------|--------------------------|
| `REDIS_URL` | Redis connection string  | `redis://localhost:6379` |
| `DATABASE_URL` | Prisma database connection string | (set in `.env`) |

## Common Tasks

### Add a new API route

1. Create a new route file in `src/api/routes/`.
2. Define an Express router with handlers.
3. Mount it in `src/api/index.ts` using `app.use()`.

### Add a new background worker

1. Create a new worker file in `src/workers/`.
2. Import the shared Redis connection from `src/shared/redis.ts`.
3. Import the Prisma client from `src/shared/db.ts` if database access is needed.
4. Define a `Worker` instance with the queue name and processor function.

### Modify the database schema

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` to generate and apply the migration.
3. The Prisma client types update automatically after migration.

## Conventions

- Use Biome for all formatting and linting -- do not introduce ESLint or Prettier.
- Validate all external input (HTTP request bodies, job payloads) with Zod.
- Wrap related database writes in Prisma `$transaction` blocks.
- Keep shared infrastructure (DB client, Redis, config) in `src/shared/`.
- Route handlers go in `src/api/routes/`, background processors go in `src/workers/`.
