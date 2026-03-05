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
