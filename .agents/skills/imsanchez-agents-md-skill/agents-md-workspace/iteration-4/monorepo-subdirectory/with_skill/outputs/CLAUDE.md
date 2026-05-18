# Acme Platform

Monorepo for the Acme SaaS platform.

## Structure

- `apps/web/` — Next.js frontend
- `packages/auth/` — Authentication library (JWT + session management)
- `packages/ui/` — Shared React component library
- `packages/shared/` — Shared types and utilities

## Development

Uses turborepo. Run from root:
- `turbo build` — Build all packages
- `turbo test` — Test all packages
- `turbo dev` — Dev mode for all packages

## Package-level docs

Individual packages may have their own `CLAUDE.md` with package-specific
architecture notes, gotchas, and testing guidance. Check the package directory
before making changes.

- `packages/auth/CLAUDE.md` — Token lifecycle, refresh rotation semantics, test caveats
