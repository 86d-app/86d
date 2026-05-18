# Acme Platform

Monorepo for the Acme SaaS platform.

## Structure

- `apps/web/` — Next.js frontend
- `packages/auth/` — Authentication library (JWT + session management). **See `packages/auth/CLAUDE.md` for auth-specific guidance** (token refresh rotation, environment variables, retry constraints).
- `packages/ui/` — Shared React component library
- `packages/shared/` — Shared types and utilities

## Development

Uses turborepo. Run from root:
- `turbo build` — Build all packages
- `turbo test` — Test all packages
- `turbo dev` — Dev mode for all packages
