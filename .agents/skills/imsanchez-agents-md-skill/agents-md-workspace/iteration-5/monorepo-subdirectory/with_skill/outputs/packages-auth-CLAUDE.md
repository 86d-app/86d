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
- When writing tests that exercise the refresh flow, each call consumes the
  token. Generate a fresh token per test case or the second assertion will 401.
