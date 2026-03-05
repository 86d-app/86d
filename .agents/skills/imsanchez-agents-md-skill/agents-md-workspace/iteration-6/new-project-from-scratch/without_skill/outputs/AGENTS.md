# AGENTS.md

## Project Overview

**inventory-api** is a TypeScript-based inventory management service built on Express. It exposes a REST API for inventory and webhook operations and includes a background worker that syncs inventory changes to a warehouse management system via BullMQ job queues. Data is persisted with Prisma (database ORM) and Redis is used for queue transport and caching.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Web framework:** Express 4
- **Database ORM:** Prisma (`@prisma/client` + `prisma` CLI)
- **Queue system:** BullMQ (backed by Redis via `ioredis`)
- **Validation:** Zod
- **Linter/Formatter:** Biome
- **Test framework:** Vitest
- **Dev runner:** tsx (for watch mode and script execution)

## Repository Structure

```
src/
  api/
    index.ts          # Express app entry point (listens on port 3000)
    routes/
      inventory.ts    # Inventory CRUD routes (mounted at /api/inventory)
      webhooks.ts     # Webhook routes (mounted at /api/webhooks)
  workers/
    sync-worker.ts    # BullMQ worker that processes "inventory-sync" jobs
  shared/
    redis.ts          # Shared Redis connection (uses REDIS_URL env var)
    db.ts             # Shared Prisma client instance
    seed.ts           # Database seed script
```

### Key Architectural Patterns

- **API layer** (`src/api/`): Express routers handle HTTP requests. The entry point is `src/api/index.ts`.
- **Workers** (`src/workers/`): Background job processors using BullMQ. The `sync-worker` listens on the `"inventory-sync"` queue and updates product quantities inside a Prisma transaction, also creating an audit log entry.
- **Shared modules** (`src/shared/`): Singleton instances (Redis connection, Prisma client) shared across the API and workers. The Redis client defaults to `redis://localhost:6379` if `REDIS_URL` is not set.

## Build and Development

### Prerequisites

- Node.js (LTS recommended)
- A running Redis instance (default: `redis://localhost:6379`)
- A database supported by Prisma (connection configured via Prisma schema / environment)

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

This runs `tsc` to compile TypeScript to JavaScript.

### Run in Development Mode

```bash
npm run dev
```

This starts the API server with `tsx watch` on `src/api/index.ts`, providing hot-reload on file changes.

### Database Commands

```bash
npm run db:migrate   # Run Prisma migrations (development)
npm run db:seed      # Seed the database with initial data
npm run db:studio    # Open Prisma Studio (visual database browser)
```

Run migrations before starting the application for the first time or after schema changes.

## Testing

```bash
npm test             # Run tests in watch mode (Vitest)
npm run test:ci      # Run tests once with coverage report
```

- Tests use **Vitest**. Place test files alongside source files using the `*.test.ts` or `*.spec.ts` naming convention, or in a `__tests__/` directory.
- Always run `npm test` (or `npm run test:ci`) before committing to verify nothing is broken.

## Linting and Formatting

```bash
npm run lint         # Check for lint and formatting issues (Biome)
npm run lint:fix     # Auto-fix lint and formatting issues
```

- The project uses **Biome** (not ESLint/Prettier). Run `npm run lint` before committing.
- To auto-fix issues, use `npm run lint:fix`.

## Environment Variables

| Variable    | Purpose                          | Default                    |
|-------------|----------------------------------|----------------------------|
| `REDIS_URL` | Redis connection URL             | `redis://localhost:6379`   |

Database connection details are configured through Prisma's standard environment variables (typically `DATABASE_URL` in a `.env` file or Prisma schema).

## Common Tasks for Agents

### Adding a New API Route

1. Create a new router file in `src/api/routes/`.
2. Define routes using `express.Router()`.
3. Register the router in `src/api/index.ts` with `app.use()`.
4. Use Zod for request body/param validation.

### Adding a New Background Worker

1. Create a new worker file in `src/workers/`.
2. Import the shared Redis connection from `src/shared/redis.ts`.
3. Import the Prisma client from `src/shared/db.ts` if database access is needed.
4. Use `new Worker("queue-name", handler, { connection: redis })` to define the worker.

### Modifying the Database Schema

1. Edit the Prisma schema file (typically `prisma/schema.prisma`).
2. Run `npm run db:migrate` to generate and apply a migration.
3. The Prisma client types update automatically after migration.

### Running the Full Stack Locally

1. Start Redis (`redis-server` or via Docker).
2. Run `npm run db:migrate` to set up the database.
3. Optionally run `npm run db:seed` to populate test data.
4. Run `npm run dev` to start the API server.
5. Start workers separately if needed (e.g., `tsx src/workers/sync-worker.ts`).
