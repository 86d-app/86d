# @86d-app/payments

## 1.0.0

### Major Changes

- [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7) Thanks [@imsanchez](https://github.com/imsanchez)! - Contain legacy saved-Payment-method, refund, shopper Shipping quote/tracking,
  and shipment mutation routes until verified Customer identity and durable,
  Connection-bound, fulfillment-linked v2 operations replace them.

- [`3f1e046`](https://github.com/86d-app/86d/commit/3f1e04626f4a115f57c7a0c758ed9c7a17f7ab76) Thanks [@imsanchez](https://github.com/imsanchez)! - Contain unsafe payment, checkout, fulfillment, and provider-webhook activation paths. Shopper-facing payment and label-purchase endpoints are removed, checkout completion fails explicitly until authoritative decisions are available, and provider integrations now require documented webhook verification material or remain disabled.

- [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0) Thanks [@imsanchez](https://github.com/imsanchez)! - Replace Module-visible cross-data and aggregate-controller access with owner-scoped contexts and versioned, runtime-validated capabilities. Required capabilities now fail admission before initialization effects, each consumer is restricted to its accepted operations, provider requests and outcomes are validated at both contract boundaries, and commerce call sites fail closed through typed owner decisions. Paid subscription activation remains unavailable until payment proof consumption is purpose-bound and duplicate-safe.

### Minor Changes

- [`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d) Thanks [@imsanchez](https://github.com/imsanchez)! - Add connection-bound provider contracts and an owner-local Payment Connection
  service with durable, idempotent v2 operation and attempt records. Generated
  Runtime composition no longer selects the first configured payment provider.

- [`1975eb8`](https://github.com/86d-app/86d/commit/1975eb8b66c7f7945b8891d8b6ad31f4442fb6b1) Thanks [@imsanchez](https://github.com/imsanchez)! - Require reconciliation callers to supply the original durable operation
  payload. Add the Store-owned Payment v2 aggregate, bounded operation recovery,
  durable Connection-bound webhook receipts, and unregistered PayPal, Stripe,
  and Braintree Payment Connection adapters. Freeze a server-provisioned upstream
  provider account identity across credential rotation, and bound PayPal exact-request
  capture/refund recovery by documented idempotency behavior. Checkout activation
  and legacy provider webhook mutation remain contained until the commerce
  dependency gate and provider evidence pass.

### Patch Changes

- Updated dependencies [[`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`b3c8feb`](https://github.com/86d-app/86d/commit/b3c8feb924c371a20b652313181166a61196acb5), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`1975eb8`](https://github.com/86d-app/86d/commit/1975eb8b66c7f7945b8891d8b6ad31f4442fb6b1), [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0)]:
  - @86d-app/core@1.0.0
