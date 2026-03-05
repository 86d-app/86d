# @acme/auth

JWT authentication and session management library for the Acme platform.
Handles access token creation/verification (`jose`, HS256) and encrypted
session cookies (`iron-session`).

## Development

```sh
turbo test --filter=@acme/auth   # run auth tests from root
vitest                            # run tests from this directory
tsup                              # build from this directory
```

## Architecture

- Access tokens are short-lived JWTs (15-minute TTL). The short window is a
  deliberate security trade-off — it limits blast radius if a token leaks.
- Refresh tokens use **sliding-window rotation**: each refresh issues a new
  token pair and immediately invalidates the old refresh token. This prevents
  token replay attacks but has important implications for client code (see
  Gotchas below).
- `JWT_SECRET` is read from `process.env` on every call — it is **not**
  cached at import time. The env var must be set before any auth calls.

## Token Refresh Lifecycle

The refresh flow works as follows:

1. Client sends the current refresh token to the refresh endpoint.
2. Server validates the refresh token and issues a **new** access + refresh token pair.
3. The old refresh token is **immediately invalidated** — it cannot be used again.
4. Client must store and use only the newly issued token pair going forward.

This is a one-time-use rotation model. There is no grace period and no
reuse window. Once a refresh token has been presented to the server, it is
burned regardless of whether the client successfully received the response.

## Gotchas

- **Retry logic cannot reuse refresh tokens.** Because rotation invalidates
  the old token instantly, a retry that replays a stale refresh token will
  get a 401. On refresh failure the client must re-authenticate from scratch —
  never retry with the same refresh token.
- **Network-failure handling matters.** If a refresh request succeeds on the
  server but the response is lost (e.g., timeout), the old token is already
  burned. The client has no valid refresh token and must re-authenticate.
  Callers should treat any non-success response from the refresh endpoint as
  "start over", not "try again".
- **Do not add automatic retry wrappers around refresh calls.** Generic HTTP
  retry middleware (e.g., axios-retry, fetch-retry) will silently replay the
  consumed refresh token and produce confusing 401 errors. Exclude the refresh
  endpoint from any retry interceptors.
- When writing tests that exercise the refresh flow, each call consumes the
  token. Generate a fresh token per test case or the second assertion will 401.
- `JWT_SECRET` must be available as an environment variable before any auth
  function is called. It is read from `process.env` at call time, not cached
  at module load. In tests, set it in a `beforeAll` or setup file.
