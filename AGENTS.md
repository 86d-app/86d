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
bun run db:seed              # seed demo data (requires DATABASE_URL)
bun run generate:modules     # regenerate module imports from config
bun run 86d init             # configure a local store
bun run 86d module create x  # scaffold a new module
bun run 86d template create x  # scaffold a new template
```

## Repository structure

```
apps/store/          Next.js storefront + per-store admin
modules/             75 modules (cart, products, orders, checkout, collections, brands, announcements, backorders, preorders, affiliates, appointments, auctions, automations, comparisons, recommendations, multi-currency, faq, forms, tickets, customer-groups, quotes, product-qa, product-labels, product-feeds, social-proof, store-locator, returns, store-credits, audit-log, vendors, flash-sales, warranties, gift-registry, gift-wrapping, delivery-slots, invoices, store-pickup, bulk-pricing, redirects, sitemap, etc.)
packages/
  core/              Module system (isolation boundary, contracts, test-utils)
  runtime/           Store runtime engine (data service, registry)
  cli/               CLI tool (dev, init, module, template, generate)
  registry/          Git-based module registry (resolve, fetch, cache modules)
templates/
  brisa/             Default store template (config.json, MDX pages, global.css)
tests/e2e/           Playwright E2E tests (storefront, admin, checkout, visual)
scripts/             Code generation + seed (generate-modules.ts, seed.ts)
internals/github/    CI setup action
```

## Module system

Every module exports a factory → Module object with `id`, `version`, `schema`, `endpoints`, and optional `init`. Modules depend only on `@86d-app/core`. All DB access goes through `ModuleDataService` (provided by runtime). Modules cannot import other modules directly — cross-module access uses declared contracts (`requires`/`exports`).

Admin pages declare `group` and optional `subgroup` for 2-level sidebar navigation. Groups: Catalog, Sales, Customers, Fulfillment, Marketing, Content, Finance, Support, System. All groups have collapsible subgroups (e.g., Sales → Orders, Cart, Billing; Content → Publishing, Knowledge, Site; Finance → Gateways, Configuration; Support → Helpdesk, Messaging; System → Monitoring, Tools). Subgroup mapping is centralized in `apps/store/lib/admin-registry.ts`.

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

## Core packages

| Package | Status | Purpose |
|---------|--------|---------|
| `db` | Complete | Prisma client singleton (PrismaPg adapter) |
| `env` | Complete | Zod env validation |
| `auth` | Complete | Better Auth (sessions, admin role) |
| `utils` | Complete | Logger, rate-limit, url, sanitize |
| `lib` | Complete | API keys, webhooks, carrier tracking, LLM content |
| `emails` | Complete | React Email + Resend (16 templates) |
| `registry` | Complete | Git-based module registry (resolve, fetch, cache) |
| `runtime` | Complete | ModuleRegistry, UniversalDataService |
| `sdk` | Complete | Store config, template loading, API client |
| `cli` | Complete | `86d dev/init/module/template/generate` (69 tests) |

## Code conventions

- Biome handles formatting and linting. Tailwind class sorting enforced via `useSortedClasses`.
- No `any` without a `biome-ignore` comment.
- Module imports: `@86d-app/core` (main), `@86d-app/core/client` (React Query), `@86d-app/core/state` (MobX).
- Store app path alias: `~/` for local imports (not bare `lib/`).
- Tests use `@86d-app/core/test-utils` mock data services. Never a real database.

## Security conventions

- **Sanitize all user text inputs** in store endpoints: use `.transform(sanitizeText)` from `@86d-app/core` on every string field that accepts user-provided text (names, descriptions, messages, notes, titles). This strips HTML/script tags and normalizes whitespace.
- **Bound string lengths**: always add `.max()` to string fields, even optional ones.
- **Constrain record fields**: use `z.record(z.string().max(100), z.unknown())` with `.refine()` to limit key count when accepting arbitrary metadata/data objects.
- **Admin endpoints** are protected at the framework level via `createAdminEndpoint` — no per-endpoint auth checks needed.
- **Rate limiting** is enforced at the API route handler: 120 req/min for public, 300 req/min for admin, stricter limits on sensitive endpoints.
- **Rich HTML fields** (page content, blog posts) use `sanitizeHtml()` instead of `sanitizeText()` to preserve safe markup.
- **Return errors, don't throw**: store endpoints should `return { error: "...", status: 404 }` not `throw new Error("...")` to prevent stack trace leakage.

## Detailed docs

Read these when working in specific areas:

- `apps/store/AGENTS.md` — Store app architecture, routes, admin, theme system
- `apps/store/EXAMPLES.md` — Module usage examples
- `templates/brisa/GUIDE.md` — Template authoring guide
- `tests/e2e/AGENTS.md` — E2E test patterns, fixtures, conventions
