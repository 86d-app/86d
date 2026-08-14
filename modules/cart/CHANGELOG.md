# @86d-app/cart

## 1.0.0

### Major Changes

- [`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d) Thanks [@imsanchez](https://github.com/imsanchez)! - Replace caller-supplied Checkout line items and totals with an owner-authorized,
  versioned Cart snapshot capability. Guest Checkout access now requires a
  high-entropy httpOnly proof rather than possession of a session UUID.
  Products now accept only integer-minor-unit prices, reject stock mutations that
  belong to Inventory, contain direct imports, and retire duplicate Collection
  write endpoints.
  Order-creation contracts now reject non-integer monetary snapshots.
  Inventory adjustments now enter through an authenticated, idempotent Command
  transport, while checkout reservations use durable row-locked v2 operations.
  Tax exposes explicit v2 jurisdiction and quote decisions with deterministic
  integer allocation and effective-dated policy provenance.
  Product-feed generation is contained until it derives output from an immutable
  published Catalog revision instead of caller-supplied product data.
  Products now exposes an owner-local Catalog revision engine with
  immutable digests, reviewed publication, stale-base conflict detection,
  transition audit, replay receipts, and an atomic `catalog.published@1` fact.
  Authenticated Store Admin transport now creates, reviews, publishes, gets, and
  lists those revisions while deriving actor and Store authority from the session.
  Checkout now exports a dormant, owner-local Checkout Request foundation with
  row-locked idempotent creation, sanitized contact data, immutable Cart choices,
  bounded retention, invitation state, and no live-money or inventory authority.
  Its bounded Store transport resolves a caller-owned Cart and protects request
  reads with authenticated ownership or a request-scoped guest proof. Invitation
  transitions remain unavailable until durable delivery can prove the send.

- [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0) Thanks [@imsanchez](https://github.com/imsanchez)! - Replace Module-visible cross-data and aggregate-controller access with owner-scoped contexts and versioned, runtime-validated capabilities. Required capabilities now fail admission before initialization effects, each consumer is restricted to its accepted operations, provider requests and outcomes are validated at both contract boundaries, and commerce call sites fail closed through typed owner decisions. Paid subscription activation remains unavailable until payment proof consumption is purpose-bound and duplicate-safe.

### Patch Changes

- Updated dependencies [[`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`b3c8feb`](https://github.com/86d-app/86d/commit/b3c8feb924c371a20b652313181166a61196acb5), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`1975eb8`](https://github.com/86d-app/86d/commit/1975eb8b66c7f7945b8891d8b6ad31f4442fb6b1), [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0)]:
  - @86d-app/core@1.0.0
