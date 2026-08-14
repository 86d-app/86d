# @86d-app/fulfillment

## 1.0.0

### Major Changes

- [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7) Thanks [@imsanchez](https://github.com/imsanchez)! - Make standalone Fulfillment the delivery-obligation writer. Orders now exposes a
  typed line-quantity validation capability, while Fulfillment creation requires
  owner-local row-locking transactions and rejects cumulative active obligations
  above the immutable Order quantities. Empty generic obligations remain rejected
  until explicit zero-line obligation types are modeled. Direct status, tracking,
  and cancellation routes remain contained until Shipping-aware durable workflows
  replace the compatibility controller writers.

### Patch Changes

- Updated dependencies [[`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`b3c8feb`](https://github.com/86d-app/86d/commit/b3c8feb924c371a20b652313181166a61196acb5), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`5f3ba3b`](https://github.com/86d-app/86d/commit/5f3ba3bb2c771397fb59f23ae0cf6f8e77e0b88d), [`cdc4ef2`](https://github.com/86d-app/86d/commit/cdc4ef2c9711db3a9e8d411ecf1a2ba73a817dd7), [`1975eb8`](https://github.com/86d-app/86d/commit/1975eb8b66c7f7945b8891d8b6ad31f4442fb6b1), [`2dc4213`](https://github.com/86d-app/86d/commit/2dc42134006afd725fb1d20576cae0ad4e9287a0)]:
  - @86d-app/core@1.0.0
