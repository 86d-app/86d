# AGENTS.md

## Project Overview

This is **inventory-api**, a TypeScript REST API for inventory management. The stack consists of Express for HTTP routing, Prisma as the ORM (with PostgreSQL), BullMQ for background job queues, ioredis for Redis connectivity, and Zod for runtime validation. Biome handles linting and formatting, and Vitest is used for testing.

## Build and Run

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start the dev server with hot reload (port 3000)
npm run dev
```

### Database Setup

```bash
# Run Prisma migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio (visual DB browser)
npm run db:studio
```

Always run migrations before seeding: `npm run db:migrate && npm run db:seed`.

### Prerequisites

- Node.js (LTS recommended)
- A running Redis instance (defaults to `redis://localhost:6379`; override with the `REDIS_URL` env var)
- A PostgreSQL database (configure via `DATABASE_URL` in `.env` or the Prisma schema)

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once with coverage (CI)
npm run test:ci
```

The test framework is **Vitest**. Test files should use the `.test.ts` or `.spec.ts` extension and can be placed alongside source files or in `__tests__` directories.

## Linting and Formatting

```bash
# Check for lint/format issues
npm run lint

# Auto-fix lint/format issues
npm run lint:fix
```

The project uses **Biome** exclusively -- there is no ESLint or Prettier configuration.

## Codebase Structure

```
src/
  api/                # Express HTTP layer
    index.ts          # App entrypoint -- mounts routers, starts server on :3000
    routes/           # Route modules (inventory, webhooks)
  workers/            # BullMQ background job processors
    sync-worker.ts    # Processes inventory-sync jobs (updates product + writes audit log)
  shared/             # Modules shared between the API and workers
    redis.ts          # Singleton ioredis connection
    db.ts             # Singleton Prisma client
    seed.ts           # Database seed script
```

### Architecture

- **API layer** (`src/api/`): Express routers mounted at `/api/inventory` and `/api/webhooks`. The entrypoint is `src/api/index.ts`.
- **Background workers** (`src/workers/`): BullMQ workers consuming jobs from Redis queues. The `inventory-sync` worker updates product quantities and creates audit log entries inside a single Prisma transaction.
- **Shared modules** (`src/shared/`): Centralized database (Prisma) and Redis (ioredis) clients. Always import from here rather than creating new connections.
- **Validation**: Zod is used for request body and job payload validation.

## Environment Variables

| Variable       | Purpose                          | Default                  |
|----------------|----------------------------------|--------------------------|
| `REDIS_URL`    | Redis connection string          | `redis://localhost:6379` |
| `DATABASE_URL` | Prisma/PostgreSQL connection URL | (see Prisma schema)      |

## Conventions

- All database writes use Prisma transactions so that data changes and their corresponding audit log entries are atomic.
- Zod schemas define and validate all external input (request bodies, job payloads).
- The Redis connection is centralized in `src/shared/redis.ts` -- never instantiate a second Redis client.
- All API routes live under the `/api/` prefix.
- Biome enforces code style; run `npm run lint:fix` before committing.

## Common Tasks

- **Add a new API route**: Create a router file in `src/api/routes/`, then mount it in `src/api/index.ts` with `app.use(...)`.
- **Add a background job**: Create a new worker file in `src/workers/` following the pattern in `sync-worker.ts`.
- **Change the database schema**: Edit the Prisma schema, run `npm run db:migrate`, and restart the dev server so the generated Prisma client picks up the changes.
- **Add shared utilities**: Place them in `src/shared/` so both the API and workers can import them.

## Gotchas

- Call `redis.quit()` in test teardown -- open Redis connections will cause Vitest to hang.
- BullMQ workers share the same Redis connection as the API; if Redis goes down, both HTTP caching and job processing are affected.
- The `inventory-sync` worker wraps its update and audit log write in `prisma.$transaction` -- never split these into separate calls or you risk inconsistent state.
- After modifying Prisma models, you must run `npm run db:migrate` and restart the dev server for the generated client to reflect the changes.
