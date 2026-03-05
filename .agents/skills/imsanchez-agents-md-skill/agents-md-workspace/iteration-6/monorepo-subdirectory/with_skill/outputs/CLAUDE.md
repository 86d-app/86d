# Acme Platform

Monorepo for the Acme SaaS platform.

## Structure

- `apps/web/` — Next.js frontend
- `packages/auth/` — Authentication library (JWT + session management). **Has its own CLAUDE.md** with token rotation details.
- `packages/ui/` — Shared React component library
- `packages/shared/` — Shared types and utilities

## Development

Uses turborepo. Run from root:
- `turbo build` — Build all packages
- `turbo test` — Test all packages
- `turbo dev` — Dev mode for all packages

## Package-specific docs

Some packages have their own `CLAUDE.md` with context specific to that area. Check the package directory before working in it.
