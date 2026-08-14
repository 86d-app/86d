# @86d-app/shipping

## 1.0.0

### Major Changes

- [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7) Thanks [@imsanchez](https://github.com/imsanchez)! - Contain legacy saved-Payment-method, refund, shopper Shipping quote/tracking,
  and shipment mutation routes until verified Customer identity and durable,
  Connection-bound, fulfillment-linked v2 operations replace them.

- [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7) Thanks [@imsanchez](https://github.com/imsanchez)! - Contain process-local provider webhook effects while preserving strict signature
  verification. Registered payment and EasyPost callbacks now reject missing or
  invalid verification and return an explicit retryable durability-required error
  after successful verification until provider receipts and outcome workflows are
  durable.

- [`3f1e046`](https://github.com/86d-app/86d/commit/3f1e04626f4a115f57c7a0c758ed9c7a17f7ab76) Thanks [@imsanchez](https://github.com/imsanchez)! - Contain unsafe payment, checkout, fulfillment, and provider-webhook activation paths. Shopper-facing payment and label-purchase endpoints are removed, checkout completion fails explicitly until authoritative decisions are available, and provider integrations now require documented webhook verification material or remain disabled.

- [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0) Thanks [@imsanchez](https://github.com/imsanchez)! - Replace Module-visible cross-data and aggregate-controller access with owner-scoped contexts and versioned, runtime-validated capabilities. Required capabilities now fail admission before initialization effects, each consumer is restricted to its accepted operations, provider requests and outcomes are validated at both contract boundaries, and commerce call sites fail closed through typed owner decisions. Paid subscription activation remains unavailable until payment proof consumption is purpose-bound and duplicate-safe.

### Patch Changes

- Updated dependencies [[`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`b3c8feb`](https://github.com/86d-app/86d/commit/b3c8feb924c371a20b652313181166a61196acb5), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`1975eb8`](https://github.com/86d-app/86d/commit/1975eb8b66c7f7945b8891d8b6ad31f4442fb6b1), [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0)]:
  - @86d-app/core@1.0.0
