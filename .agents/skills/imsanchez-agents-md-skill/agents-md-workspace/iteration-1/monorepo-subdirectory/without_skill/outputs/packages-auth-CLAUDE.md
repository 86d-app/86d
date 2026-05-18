# Auth Package (`@acme/auth`)

JWT authentication and session management library for the Acme platform.

## Architecture

- **JWT tokens** are signed and verified using `jose` with HS256 algorithm. Access tokens expire after 15 minutes.
- **Sessions** are managed via `iron-session`.
- **Token refresh uses sliding-window rotation**: the refresh token is rotated on every use, and old refresh tokens are immediately invalidated. This means retry logic on 401 responses must re-authenticate from scratch rather than retrying with the same refresh token. Do not write code that retries a failed refresh using the previous refresh token — it will always fail.

## Environment

Requires `JWT_SECRET` environment variable to be set.

## Commands

Run from this directory or via turborepo from the root:

- `npm run build` — Build with tsup
- `npm run test` — Run tests with vitest
- `npm run test:watch` — Run tests in watch mode
