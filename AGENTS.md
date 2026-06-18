# 86d — framework (public)

Modular, open-source commerce framework. Modules are isolated, interchangeable units, not monolithic plugins. Each store is single-tenant with full data ownership. This repo is the engine that the proprietary 86d platform (sibling `private/` repo) provisions and deploys; it also runs fully standalone via Docker. See the root `AGENTS.md` for how the areas fit together.

Bun monorepo orchestrated by Turborepo. TypeScript everywhere, strict mode.

## Quick start

```bash
# Docker (recommended — zero config)
docker compose up                  # postgres + store on :3000 (auto-migrates, seeds, creates admin)

# Local development
bun install                        # also runs generate:modules (--frozen) via postinstall
bun run generate:modules           # regenerate module imports from config
bun run db:seed                    # seed demo data (requires DATABASE_URL)
bun run dev                        # store dev server on :3000 (do NOT run in a headless cycle)
```

Default admin: `admin@example.com` / `password123`.

## Build, test, CLI

```bash
bun run build                # build everything
bun run typecheck            # TypeScript across all packages
bun run check                # Biome lint + format
bun run test                 # Vitest unit tests
bun run test:e2e             # Playwright E2E (needs a running, seeded store)
bun run generate:modules     # regenerate generated/components.ts + module imports
bun run generate:registry    # regenerate registry.json from module metadata
bun run generate:docs        # regenerate docs/component-api.md
bun run 86d <command>        # the CLI (see below)
bun run bump-version         # shared version bump (see Version policy)
```

## Repository structure

```
apps/store/          Next.js storefront + per-store admin
docker/              Docker entrypoint + config
modules/             100 modules (cart, products, orders, checkout, collections, brands, ...)
packages/
  core/              Module system: isolation boundary, contracts, types, sanitization, test-utils
  runtime/           Store runtime: ModuleRegistry, UniversalDataService
  cli/               CLI tool (dev, init, module, template, generate, status, doctor)
  registry/          Git-based module registry (resolve, fetch, cache)
  storage/           Storage abstraction (local FS, Vercel Blob, S3-compatible)
  db/                Prisma client singleton (PrismaPg adapter)
  auth/              Better Auth (sessions, admin role, 86d.app SSO)
  emails/            React Email + Resend templates
  env/               Zod env validation (includes STORAGE_PROVIDER)
  utils/             Logger, rate-limit, url, sanitize (text + HTML)
  lib/               API keys, webhooks, carrier tracking, LLM content
  sdk/               Store config, template loading, API client
templates/
  brisa/             Default store template (config.json, MDX pages, global.css)
tests/e2e/           Playwright E2E (storefront, admin, checkout, dashboard, accessibility, performance, visual)
scripts/             generate-modules.ts, generate-registry.ts, generate-component-docs.ts, seed.ts
internals/github/    CI setup action
Dockerfile           Multi-stage build (deps → build → runtime)
docker-compose.yml   One-command local deployment (postgres + store)
```

All 12 packages are fully implemented. All 100 modules ship with real schema, controllers, service implementations, and endpoints; the registry (`registry.json`) carries metadata and integrity hashes for every one.

## Module system

Every module exports a factory → Module object with `id`, `version`, `schema`, `endpoints`, and optional `init`. Modules depend **only** on `@86d-app/core`. All DB access goes through `ModuleDataService` (provided by runtime). Modules cannot import other modules directly — cross-module access uses declared contracts (`requires` / `exports`).

Admin pages declare a `group` and optional `subgroup` for the 2-level sidebar. Groups: Catalog, Sales, Customers, Fulfillment, Marketing, Content, Finance, Support, System. Subgroup mapping is centralized in `apps/store/lib/admin-registry.ts`.

```
modules/<name>/src/
  index.ts              Factory + types + admin nav
  schema.ts             Zod schemas
  controllers.ts        Business logic
  store/endpoints/      Public endpoints
  store/components/     Customer-facing components (.tsx + .mdx)
  admin/endpoints/      Protected endpoints
  admin/components/     Admin UI components (.tsx + .mdx)
```

External-provider modules (Stripe, Square, PayPal, Braintree, Amazon, EasyPost shipping, tax, DoorDash, Uber Direct, etc.) make **real HTTP calls** with proper auth, retries, error mapping, and webhook signature verification — no mocked fetches. When credentials are missing they degrade gracefully: admin shows "not configured" and the store hides the feature without crashing.

## Template system

Templates live in `templates/<name>/`. The store app resolves them via tsconfig alias `template/*` → `../../templates/brisa/*`. Each template has `config.json` (modules, OKLCH color tokens, logos), `layout.mdx`, `index.mdx`, page MDX files, and `global.css`. Components follow a two-file pattern: `.tsx` (logic) + `.mdx` (presentation); numbered MDX variants (`1.mdx`, `2.mdx`) are alternate designs for the same component.

**Component overrides:** templates override module components via `templates/<name>/components/index.tsx` — exported names replace matching module defaults at render time. `generate:modules` wires this up by spreading `...templateOverrides` last in `generated/components.ts`. **External templates:** `86d template add github:owner/repo`.

## CLI

`bun run 86d <command>` (source: `packages/cli/src/commands/`):

- `dev`, `init`, `status`, `doctor`
- `module create | add | list | search | info | enable | disable`
- `template create | activate | list`
- `generate modules | components`

## Registry

`registry.json` carries per-module metadata (description, version, category, `requires`, `hasStoreComponents`, `hasAdminComponents`, `hasStorePages`, integrity hash). The resolver loads the manifest locally or from `https://raw.githubusercontent.com/86d-app/86d/main/registry.json` (the canonical source — never assume a local copy is authoritative). The fetcher retries with exponential backoff (max 3, 500–2000ms). A wildcard includes all registry modules plus local workspace modules. `registry.lock.json` caches resolved versions and integrity hashes.

## Deployment modes

- **Docker (self-hosted):** `docker compose up` starts PostgreSQL + store, auto-runs migrations, seeds demo data, creates the admin user, uses local-filesystem blob storage. Set `BETTER_AUTH_SECRET` to a secure random string in production.
- **Managed (Railway or Vercel + Neon):** the 86d platform provisions a dedicated instance with its own database, hosting, and blob storage. It sets `86D_API_KEY` + `STORE_ID`; with `86D_API_KEY` present the store pulls config and billing from `86d.app` and enables 86d.app SSO for admin auth.
- **Storage providers:** `STORAGE_PROVIDER` = `local` (Docker default), `vercel`, or `s3` (MinIO, AWS S3, R2). See `.env.example`.

## API endpoints

- `GET /api/health` — DB connectivity + store status (Docker HEALTHCHECK).
- `POST /api/upload` — file upload (admin only; JPEG/PNG/WebP/GIF/SVG/PDF, magic-byte validated, SVG XSS checked).
- `DELETE /api/upload` — file deletion (admin only, store-isolated).
- `GET /uploads/[...path]` — serve local-storage files when `STORAGE_PROVIDER=local` (SVGs served with restrictive CSP).
- `GET/POST /api/auth/[...all]` — Better Auth handlers (sign-in, sign-up, SSO).
- `ALL /api/[...path]` — module endpoints (rate-limited, session-authenticated).

## Code conventions

- Biome handles formatting and linting; Tailwind class sorting enforced via `useSortedClasses`.
- No `any`, `@ts-expect-error`, `@ts-ignore`, or `biome-ignore`. Fix the type or the code.
- Module imports: `@86d-app/core` (main), `@86d-app/core/client` (React Query), `@86d-app/core/state` (MobX).
- Store app path alias: `~/` for local imports (not bare `lib/`, which conflicts with `packages/lib`).
- Use the `@86d-app/storage` abstraction — never import `@vercel/blob` directly.
- Tests use `@86d-app/core/test-utils` mock data services. Never hit a real database.

## Security conventions

- **Sanitize all user text** in store endpoints: `.transform(sanitizeText)` from `@86d-app/core` on every user-provided string (names, descriptions, messages, notes, titles).
- **Bound string lengths:** add `.max()` to every string field, even optional ones. **Bound arrays:** `.max()` on every user-input array.
- **Constrain records:** `z.record(z.string().max(100), z.unknown())` with `.refine()` to limit key count on arbitrary metadata.
- **Admin endpoints** are auth-protected at the framework level via `createAdminEndpoint` — no per-endpoint checks needed.
- **Rate limiting** at the route handler: 120 req/min public, 300 req/min admin, stricter on sensitive endpoints.
- **Rich HTML** fields (page content, blog posts) use `sanitizeHtml()` instead of `sanitizeText()`.
- **Return errors, don't throw:** store endpoints `return { error: "...", status: 404 }` to avoid stack-trace leakage.
- **Never trust client identity:** derive `customerId`/email from `ctx.context.session.user`, never the request body. Never accept trust-elevation flags (e.g. `isVerifiedPurchase`) from clients.
- **Verify ownership** before mutating user-scoped resources (`resource.customerId === session.user.id`); return 404, not 403, to avoid leaking existence.

## Module completeness

A module is complete when: schema defines real tables with relations; store endpoints return real data with error handling; admin endpoints cover full CRUD; admin UI renders real data with loading/error/empty states; store UI is wired into the template; external-provider modules make real authenticated HTTP calls with retries, error mapping, webhook signature verification, and an admin config screen showing live connection status; missing credentials degrade gracefully; unit tests cover critical paths with realistic API fixtures; Playwright snapshots cover all screens in light + dark, desktop + mobile; and no `TODO`, `FIXME`, `not implemented`, or stub bodies remain.

## Testing

**Unit (Vitest):** `bun run test`, with `@86d-app/core/test-utils` mocks. External-provider fixtures must match the real API JSON shape so a broken integration cannot pass.

**E2E (Playwright):** config at `playwright.config.ts`; specs `storefront`, `checkout`, `admin`, `dashboard`, `accessibility`, `performance`, `visual`. Visual regression runs across viewport projects `visual-desktop` (1280×720), `visual-tablet` (768×1024), `visual-mobile` (375×667), in light and dark. Import from `./fixtures/test-fixtures`, not `@playwright/test`. Selectors are always `data-testid`; always `waitForLoadState('networkidle')`, never `waitForTimeout()`. Coverage target: every page route, admin screen, store-facing screen, empty state, and error state.

## Version policy

All modules and published packages share one version. After committing, run `bun run bump-version`. It self-skips if it bumped within 24 hours; when it bumps, commit as `chore: bump version to X.Y.Z`. Never hand-edit version fields. Run `bunx changeset` when adding a module or making a breaking public API change.

## Detailed docs

- `apps/store/AGENTS.md` — store app architecture, routes, admin, theme system.
- `apps/store/EXAMPLES.md` — module usage examples.
- `templates/brisa/GUIDE.md` — template authoring guide.
- `tests/e2e/AGENTS.md` — E2E patterns, fixtures, conventions.
