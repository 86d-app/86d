# @86d-app/giftcards

## 0.0.43

### Patch Changes

- [#10](https://github.com/86d-app/86d/pull/10) [`00036b9`](https://github.com/86d-app/86d/commit/00036b9501085f02dd590e9d43016e49dc768345) Thanks [@reyhansaeed](https://github.com/reyhansaeed)! - Withdraw gift-card redemption from Store, component, and controller surfaces until an evidenced Checkout Workflow can coordinate the debit and Order safely with durable proof and closed repair behavior.

- [#11](https://github.com/86d-app/86d/pull/11) [`555fb21`](https://github.com/86d-app/86d/commit/555fb2158ec37e46a902426fc4701162d0b3f202) Thanks [@reyhansaeed](https://github.com/reyhansaeed)! - Withdraw gift-card money and destructive mutations from Store, admin, and controller surfaces until complete Workflows can execute them with durable evidence. Keep balance, status, ownership, transaction-history, and analytics projections available for legacy records, fail those reads closed when durable rows are malformed, project effective expiry consistently, make admin search and sorting operate across the full result set, and record delivery intent without claiming a message was delivered.

- Updated dependencies [[`a4f2423`](https://github.com/86d-app/86d/commit/a4f2423cb8eee5ad7ca806c633a0d900e78bc2e0)]:
  - @86d-app/ui@0.0.43
  - @86d-app/core@0.0.43
