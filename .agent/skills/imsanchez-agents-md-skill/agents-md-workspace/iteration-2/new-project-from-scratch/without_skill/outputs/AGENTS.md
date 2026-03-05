# AGENTS.md

## Project Overview

inventory-api is a TypeScript/Node.js REST API for inventory management. It uses Express for HTTP routing, Prisma as the database ORM, BullMQ for background job processing, and Redis (via ioredis) for queue transport. Input validation is handled with Zod.

## Build and Run

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Start the dev server with hot reload (runs on port 3000)
npm run dev

# Run database migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio (visual database browser)
npm run db:studio
```

Run migrations before seeding: `npm run db:migrate && npm run db:seed`.

### Prerequisites

- Node.js (latest LTS recommended)
- A running Redis instance (defaults to `redis://localhost:6379`, override via `REDIS_URL` env var)
- A PostgreSQL database (configure the connection via `DATABASE_URL` in a `.env` file or the Prisma schema)

## Testing

```bash
# Run tests in watch mode
npm test

# Run tests once with coverage (CI mode)
npm run test:ci
```

Tests use **Vitest**. Place test files alongside source files or in a dedicated `__tests__` directory using the `.test.ts` or `.spec.ts` extension.

## Linting and Formatting

```bash
# Check for lint/format issues
npm run lint

# Auto-fix lint/format issues
npm run lint:fix
```

The project uses **Biome** for both linting and formatting. There is no separate Prettier or ESLint configuration.

## Codebase Structure

```
src/
  api/              # Express HTTP server and route handlers
    index.ts        # App entrypoint -- mounts routers, starts server on :3000
    routes/         # Route modules (inventory, webhooks)
  workers/          # BullMQ background job processors
    sync-worker.ts  # Syncs inventory changes to the warehouse system
  shared/           # Shared modules used across API and workers
    redis.ts        # Singleton Redis (ioredis) connection
    db.ts           # Singleton Prisma client
    seed.ts         # Database seed script
```

### Key Architectural Patterns

- **API layer** (`src/api/`): Express routers mounted under `/api/inventory` and `/api/webhooks`. The entrypoint is `src/api/index.ts`.
- **Background workers** (`src/workers/`): BullMQ workers that process jobs off Redis queues. The `inventory-sync` worker runs Prisma transactions to update product quantities and write audit logs atomically.
- **Shared modules** (`src/shared/`): Database and Redis clients are instantiated once and imported wherever needed. The Redis connection URL is configured via the `REDIS_URL` environment variable.
- **Database access**: All database operations go through Prisma. Migrations are managed with `prisma migrate dev`. Use `prisma studio` to visually inspect data.
- **Validation**: Zod is used for runtime input validation and schema definition.

## Environment Variables

| Variable       | Purpose                 | Default                  |
|----------------|-------------------------|--------------------------|
| `REDIS_URL`    | Redis connection string | `redis://localhost:6379` |
| `DATABASE_URL` | Prisma database connection string | (see Prisma schema) |

## Conventions

- All database writes use Prisma transactions -- the `auditLog` table is populated inside the same transaction as the data change to guarantee consistency.
- Zod is the validation library for request body and job payload validation.
- Redis connection is centralized in `src/shared/redis.ts` -- always import from there, never create new connections.
- All API routes are mounted under `/api/` (e.g., `/api/inventory`, `/api/webhooks`).

## Common Tasks

- **Add a new API route**: Create a new router file in `src/api/routes/`, then mount it in `src/api/index.ts`.
- **Add a new background job**: Create a new worker file in `src/workers/` following the pattern in `sync-worker.ts`.
- **Change the database schema**: Edit the Prisma schema, then run `npm run db:migrate` to generate and apply a migration. Restart the dev server afterward so the generated Prisma client updates.
- **Add shared utilities**: Place them in `src/shared/` so both the API and workers can import them.

## Gotchas

- Always call `redis.quit()` in test teardown -- open Redis connections cause Vitest to hang indefinitely.
- The BullMQ workers share the same Redis connection as the API; if Redis is down, both the API cache and job processing fail.
- The `inventory-sync` worker uses `prisma.$transaction` -- do not call the update and audit log creation separately or you risk inconsistent state.
- After adding or changing Prisma models, run `npm run db:migrate` and restart the dev server so the generated client picks up the changes.
