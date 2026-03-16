# 86d

Modular, open-source commerce platform. Modules are isolated, interchangeable units — not monolithic plugins. Single-tenant stores with full data ownership.

## Quick start

```bash
# Docker (recommended — zero config)
docker compose up                  # postgres + store on :3000 (auto-migrates, seeds, creates admin)

# Local development
bun install                        # install dependencies
bun run generate:modules           # regenerate module imports from config
bun run generate:docs              # regenerate docs/component-api.md
bun run db:seed                    # seed demo data (requires DATABASE_URL)
bun run dev                        # start store dev server (port 3000)
```

Default admin credentials: `admin@example.com` / `password123`

## Build & test

```bash
bun run build                # build everything
bun run typecheck            # TypeScript check all packages
bun run check                # Biome lint/format all packages
bun run test                 # Vitest unit tests
bun run test:e2e             # Playwright E2E tests
bun run 86d init             # configure a local store
bun run 86d module create x  # scaffold a new module
bun run 86d template create x  # scaffold a new template
```

## Repository structure

```
apps/store/          Next.js storefront + per-store admin
docker/              Docker entrypoint + config
modules/             99 modules (cart, products, orders, checkout, collections, brands, etc.)
packages/
  core/              Module system (isolation boundary, contracts, test-utils)
  runtime/           Store runtime engine (data service, registry)
  cli/               CLI tool (dev, init, module, template, generate)
  registry/          Git-based module registry (resolve, fetch, cache modules)
  storage/           Storage abstraction (local FS, Vercel Blob, S3-compatible)
templates/
  brisa/             Default store template (config.json, MDX pages, global.css)
tests/e2e/           Playwright E2E tests (storefront, admin, checkout, visual)
scripts/             Code generation + seed (generate-modules.ts, generate-component-docs.ts, seed.ts)
docs/                Generated documentation (component-api.md — run bun generate:docs)
internals/github/    CI setup action
Dockerfile           Multi-stage build (deps → build → runtime)
docker-compose.yml   One-command local deployment (postgres + store)
```

## Deployment modes

### Docker (self-hosted)
`docker compose up` — starts PostgreSQL + store app. Auto-runs migrations, seeds demo data, creates admin user. Uses local filesystem for blob storage. Set `BETTER_AUTH_SECRET` to a secure random string in production.

### Vercel + Neon (managed)
The 86d API deploys this repo to Vercel with a Neon database and Vercel Blob storage. Set `86D_API_KEY` and `STORE_ID` env vars. When `86D_API_KEY` is set, 86d.app SSO is enabled for admin authentication.

### Storage providers
Set `STORAGE_PROVIDER` env var: `local` (default in Docker), `vercel` (Vercel deployments), `s3` (MinIO, AWS S3, R2). See `.env.example` for full config.

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
| `env` | Complete | Zod env validation (includes STORAGE_PROVIDER) |
| `auth` | Complete | Better Auth (sessions, admin role, 86d.app SSO) |
| `utils` | Complete | Logger, rate-limit, url, sanitize |
| `lib` | Complete | API keys, webhooks, carrier tracking, LLM content |
| `emails` | Complete | React Email + Resend (16 templates) |
| `registry` | Complete | Git-based module registry (resolve, fetch, cache) |
| `runtime` | Complete | ModuleRegistry, UniversalDataService |
| `sdk` | Complete | Store config, template loading, API client |
| `cli` | Complete | `86d dev/init/module/template/generate` (69 tests) |
| `storage` | Complete | Storage abstraction (local, Vercel Blob, S3) |

## API endpoints

- `GET /api/health` — Health check (DB connectivity, store status). Used by Docker HEALTHCHECK.
- `POST /api/upload` — File upload (admin only, JPEG/PNG/WebP/GIF/SVG/PDF, magic-byte validated, SVG XSS checked).
- `DELETE /api/upload` — File deletion (admin only, store-isolated).
- `GET /uploads/[...path]` — Serve local storage files (when STORAGE_PROVIDER=local, SVGs served with restrictive CSP).
- `GET/POST /api/auth/[...all]` — Better Auth handlers (sign-in, sign-up, SSO).
- `ALL /api/[...path]` — Module endpoints (rate-limited, session-authenticated).

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
- **Never trust client-provided identity**: store endpoints must derive `customerId` from `ctx.context.session.user.id`, not from request body/query. Same for email (`session.user.email`). Never accept `isVerifiedPurchase` or similar trust-elevation flags from clients.
- **Ownership verification on mutations**: before updating or deleting user-scoped resources, verify `resource.customerId === session.user.id`. Return 404 (not 403) to avoid leaking resource existence.
- **Bound array lengths**: always add `.max()` to arrays accepting user input (e.g., tags, product IDs) to prevent DoS via oversized payloads.

## Production readiness goals

The platform is working toward production-ready status. Key areas for future agents to continue:

### High priority
1. **E2E test coverage with visual snapshots** — Generate and commit Playwright visual baselines. Tests should cover: guest shopping flow (browse → cart → checkout), business owner admin flow (dashboard → manage products → configure modules). All 75 modules should be exercised.
2. **Module component customization** — Make it easy to override module components from templates. Currently there's no mechanism for templates to extend module TSX/MDX.
3. **External template sourcing** — Templates should be fetchable from GitHub repos during deployment, similar to how modules use the registry.

### Medium priority
4. **86d API integration** — When `86D_API_KEY` is set, the store communicates with 86d.app for config, modules, billing. The SSO auth flow is wired but the API doesn't exist yet.
5. **Module data seeding** — Each module should have its own seed data function that creates realistic demo content.
6. **Admin experience** — More polished admin dashboard, better module management UI, settings pages for all modules.

### Ongoing
7. **Security audit** — Continuous: unvalidated input, missing auth, SQL injection, XSS, rate limiting gaps.
8. **Test coverage** — Target 100% unit test coverage for every module. E2E tests for all critical paths.
9. **Documentation** — AGENTS.md + README.md for every module, package, and directory.
10. **Performance** — Core Web Vitals, bundle size, lazy loading, caching.

## Detailed docs

Read these when working in specific areas:

- `apps/store/AGENTS.md` — Store app architecture, routes, admin, theme system
- `apps/store/EXAMPLES.md` — Module usage examples
- `templates/brisa/GUIDE.md` — Template authoring guide
- `tests/e2e/AGENTS.md` — E2E test patterns, fixtures, conventions
