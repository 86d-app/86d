# @acme/auth

Authentication library providing JWT token management and session handling for the Acme platform.

## Stack

- **jose** — JWT creation and verification (HS256)
- **iron-session** — Encrypted cookie-based session management
- **tsup** — Build tool
- **vitest** — Test runner

## Commands

- `pnpm build` — Build with tsup
- `pnpm test` — Run tests with vitest
- `pnpm test:watch` — Run tests in watch mode

## Token refresh — sliding window with rotation

Refresh tokens are rotated on every use. The old refresh token is **immediately invalidated** after rotation. This has critical implications:

- Retry logic on 401 responses **must not** reuse a refresh token — it will already be invalid.
- If a token refresh call fails or times out, the client must re-authenticate from scratch (full login flow).
- Never store a refresh token after using it; always replace it with the new one from the rotation response.
- Race conditions between concurrent requests can cause spurious 401s if both attempt to refresh with the same token — serialize refresh attempts behind a lock or queue.

## Architecture notes

- Access tokens expire after 15 minutes (`setExpirationTime("15m")`).
- JWT signing uses `HS256` with a secret from `process.env.JWT_SECRET`.
- All token operations are async (returns Promises).
