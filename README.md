<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk. 

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/WKYLrk?referralCode=zU4Wyt&utm_medium=integration&utm_source=template&utm_campaign=generic)

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

## Docker Compose

```bash
docker compose up
```

This starts PostgreSQL, a MinIO S3-compatible bucket, and the store app.

- Store: [http://localhost:3000](http://localhost:3000)
- MinIO API: [http://localhost:9000](http://localhost:9000)
- MinIO Console: [http://localhost:9001](http://localhost:9001)
- Upload bucket: `86d-uploads`

In Docker, uploads are stored in MinIO and returned as same-origin `/uploads/...` URLs, so the browser never needs the raw bucket URL.

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
| `STORAGE_PUBLIC_URL_MODE` | Upload URL mode: `direct` or `proxy` |

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
