# Auth Package (`@acme/auth`)

JWT authentication and session management library for the Acme platform.

## Architecture

- **JWT access tokens** — Short-lived (15-minute expiry), signed with HS256 using `jose`
- **Session management** — Encrypted iron sessions via `iron-session`
- **Token refresh** — Sliding window with rotation (see critical warning below)

## Critical: Token Refresh with Rotation

The refresh token mechanism uses a **sliding window with rotation**. On every refresh, a new refresh token is issued and the **old refresh token is immediately invalidated**. This has important consequences:

- A refresh token can only be used **exactly once**. Any second use of the same token will fail.
- Retry logic on 401 responses **must not** reuse a refresh token. If a refresh attempt fails or the response is lost, the client must re-authenticate from scratch (full login flow).
- Race conditions where multiple concurrent requests attempt to refresh with the same token will cause all but the first to fail. Callers should serialize refresh attempts or use a single in-flight refresh promise.

When modifying any code that touches token refresh, keep this invariant in mind: **one refresh token, one use, then it is gone**.

## Environment Variables

- `JWT_SECRET` — Required. Secret key used for signing and verifying JWT access tokens.

## Commands

Run from this package directory or from the monorepo root via turborepo:

- `turbo test --filter=@acme/auth` — Run tests (vitest)
- `turbo build --filter=@acme/auth` — Build with tsup
- `vitest` — Run tests directly from this directory
- `vitest --watch` — Run tests in watch mode

## Dependencies

- `jose` (^5.2.0) — JWT signing and verification
- `iron-session` (^8.0.0) — Encrypted stateless session management

## Key Exports

- `createToken(payload)` — Creates a signed JWT access token with a 15-minute expiry
- `verifyToken(token)` — Verifies and decodes a JWT access token
