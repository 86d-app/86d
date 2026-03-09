# 86d

Modular, open-source commerce platform. Modules are isolated, interchangeable units — not monolithic plugins. Single-tenant stores with full data ownership.

## Build & test

```bash
bun install                  # install dependencies
bun run dev                  # start store dev server (port 3000)
bun run build                # build everything
bun run typecheck            # TypeScript check all packages
bun run check                # Biome lint/format all packages
bun run test                 # Vitest unit tests
bun run test:e2e             # Playwright E2E tests
bun run generate:modules     # regenerate module imports from config
bun run 86d init             # configure a local store
bun run 86d module create x  # scaffold a new module
bun run 86d template create x  # scaffold a new template
```

## Repository structure

```
apps/store/          Next.js storefront + per-store admin
modules/             68 modules (cart, products, orders, checkout, collections, brands, announcements, backorders, preorders, affiliates, appointments, auctions, automations, comparisons, recommendations, multi-currency, faq, forms, tickets, customer-groups, quotes, product-qa, product-labels, product-feeds, social-proof, store-locator, returns, store-credits, audit-log, vendors, flash-sales, warranties, gift-registry, etc.)
packages/
  core/              Module system (isolation boundary, contracts, test-utils)
  runtime/           Store runtime engine (data service, registry)
  cli/               CLI tool (dev, init, module, template, generate)
templates/
  brisa/             Default store template (config.json, MDX pages, global.css)
scripts/             Code generation (generate-modules.ts, generate-component-docs.ts)
internals/github/    CI setup action
```

## Module system

Every module exports a factory → Module object with `id`, `version`, `schema`, `endpoints`, and optional `init`. Modules depend only on `@86d-app/core`. All DB access goes through `ModuleDataService` (provided by runtime). Modules cannot import other modules directly — cross-module access uses declared contracts (`requires`/`exports`).

```
modules/<name>/src/
  index.ts              Factory + types + admin nav
  schema.ts             Zod schemas
  controllers.ts        Business logic
  store/endpoints/      Public endpoints
  store/components/     Customer-facing MDX components (.tsx + .mdx)
  admin/endpoints/      Protected endpoints
  admin/components/     Admin UI components (.tsx + .mdx)
```

## Template system

Templates live in `templates/<name>/`. The store app resolves them via tsconfig alias `template/*` → `../../templates/brisa/*`. Each template has `config.json` (modules, OKLCH color tokens, logos), `layout.mdx`, `index.mdx`, page MDX files, and `global.css`.

Components follow a two-file pattern: `.tsx` (logic) + `.mdx` (presentation). Numbered MDX variants (1.mdx, 2.mdx) represent different designs for the same component.

## Missing packages (need reimplementation)

The store app imports from packages removed from the proprietary codebase. These must be rebuilt:

| Package | Purpose | Import examples |
|---------|---------|-----------------|
| `db` | Prisma client | `import { db } from "db"` |
| `env` | Env var validation | `import env from "env"` |
| `auth` | Better Auth (sessions) | `import { getSession } from "auth/actions"` |
| `utils` | Logger, rate-limit, url | `import { logger } from "utils/logger"` |
| `lib` | Notifications, webhooks, carrier tracking | `import { ... } from "lib/notification-settings"` |
| `emails` | React Email + Resend | `import resend from "emails"` |
| `theme` | Tailwind theme globals | `@import "../packages/theme/globals.css"` |
| `validators` | Shared Zod schemas | `import { ... } from "validators"` |
| `api` | tRPC router | `import { ... } from "api"` |

## Code conventions

- Biome handles formatting and linting. Tailwind class sorting enforced via `useSortedClasses`.
- No `any` without a `biome-ignore` comment.
- Module imports: `@86d-app/core` (main), `@86d-app/core/client` (React Query), `@86d-app/core/state` (MobX).
- Store app path alias: `~/` for local imports (not bare `lib/`).
- Tests use `@86d-app/core/test-utils` mock data services. Never a real database.

## Detailed docs

Read these when working in specific areas:

- `apps/store/AGENTS.md` — Store app architecture, routes, admin, theme system
- `apps/store/EXAMPLES.md` — Module usage examples
- `templates/brisa/GUIDE.md` — Template authoring guide
