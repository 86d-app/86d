# @acme/auth

JWT authentication and session management library.

## Tech

- `jose` — JWT signing and verification (HS256)
- `iron-session` — Encrypted session cookies

## Development

```sh
turbo test --filter=@acme/auth   # run auth tests from root
vitest                            # run tests from this directory
tsup                              # build from this directory
```

## Gotchas

- **Token refresh uses sliding-window rotation.** Every refresh rotates the
  token — the old refresh token is immediately invalidated. Retry logic that
  replays a stale refresh token will get a 401. On refresh failure, the client
  must re-authenticate from scratch rather than retrying with the same token.
- Access tokens expire in 15 minutes. The short TTL is intentional to limit
  the blast radius of a leaked token.
- `JWT_SECRET` is read from `process.env` at call time — it is not cached.
  Make sure the env var is set before any auth calls.
