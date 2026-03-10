# DB

Prisma client singleton for the 86d platform, using PrismaPg adapter with PostgreSQL.

## Structure

```
src/
  index.ts        Prisma client singleton (global cache for HMR)
  seed.ts         Database seed script (commented out, WIP)
prisma/
  schema.prisma   Base Prisma schema (datasource, generator)
  modules.prisma  Module data models
  auth.prisma     Auth-related models
  assets.prisma   Asset/media models
  logs.prisma     Logging models
  webhooks.prisma Webhook models
  zod-generator.config.json  Zod schema generation config
```

## Key exports

- `db` — lazy-initialized `PrismaClient` proxy (cached on `globalThis` in non-production)
- `Prisma` — re-exported Prisma namespace for types and utilities

## How it works

- `PrismaClient` is imported from `@86d-app/core/prisma` (generated in core)
- Uses `@prisma/adapter-pg` (`PrismaPg`) with `DATABASE_URL` from env
- The client is **lazy-initialized via Proxy** — the connection is created on first property access, not at import time
- This allows the store app to build (`next build`) without `DATABASE_URL` set
- Throws on first actual DB access if `DATABASE_URL` is not set
- In non-production, the client is cached on `globalThis` to survive HMR reloads

## Prisma setup

- Multi-file schema: `prisma/` directory contains split `.prisma` files
- The `core` package generates the Prisma client (`packages/core/prisma/`)
- This package owns migrations and the full schema (auth + modules + assets + logs + webhooks)
- Run `prisma generate` in `packages/core/` after schema changes
- Run `prisma migrate` in `packages/db/` for migration management

## Gotchas

- Do NOT import PrismaClient directly — always use the `db` singleton from this package
- `seed.ts` is currently commented out but structured for upsert-based seeding
