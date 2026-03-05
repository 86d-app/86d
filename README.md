# 86d

Modular open-source commerce platform. Bun + Turborepo monorepo.

## Prerequisites

- [Bun](https://bun.sh) v1.3.6+
- [Node.js](https://nodejs.org) v23+
- [PostgreSQL](https://www.postgresql.org) v15+

## Quick Start

```bash
bun install
bun run 86d init
bun run dev
```

The store will be available at [http://localhost:3000](http://localhost:3000).

## Repository Structure

```
apps/store/          Next.js storefront + admin
modules/             22 business modules (products, cart, orders, etc.)
packages/
  core/              Module system foundation
  runtime/           Store runtime engine
  cli/               CLI tool
templates/
  brisa/             Default store template
scripts/             Code generation
```

## CLI

```bash
bun run 86d dev                    # Start dev server
bun run 86d init                   # Configure local store
bun run 86d module create <name>   # Scaffold a new module
bun run 86d module list            # List all modules
bun run 86d template create <name> # Create a new template from brisa
bun run 86d template list          # List all templates
bun run 86d generate               # Run code generation
```

## Scripts

```bash
bun run dev              # Dev server for the store
bun run build            # Build everything
bun run typecheck        # TypeScript check
bun run check            # Biome lint/format
bun run test             # Unit tests
bun run test:e2e         # Playwright E2E tests
```

## Environment Variables

See [`apps/store/.env.example`](apps/store/.env.example) for the full list.

| Variable               | Description                          |
|------------------------|--------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string         |
| `DATABASE_URL_UNPOOLED`| Same (used for migrations)           |
| `BETTER_AUTH_SECRET`   | Auth signing key (random string)     |
| `STORE_ID`             | Store identifier                     |

## Creating a Module

```bash
bun run 86d module create my-feature
```

This scaffolds `modules/my-feature/` with the full module structure: entry point, schema, store/admin endpoints, and component stubs. Add `"@86d-app/my-feature"` to `templates/brisa/config.json` and run `bun run 86d generate`.

## Creating a Template

```bash
bun run 86d template create minimal
```

This copies the brisa template to `templates/minimal/` with updated config. Customize the MDX files, colors, and layout to create a new design.

## Known Issues

The store app has import references to packages that were part of the original proprietary codebase and have been removed. See [AGENTS.md](AGENTS.md) for the full list of packages that need reimplementation.
