# @86d-app/ui

## 0.0.43

### Patch Changes

- Expose the shared primitives and data-table controls used by module-owned store admin tables, and make emitted relative ESM imports resolvable from every published entry point.

- Export the shared form sheet, table view options, checkbox, label, and tabs primitives for module admin surfaces.

- [`a4f2423`](https://github.com/86d-app/86d/commit/a4f2423cb8eee5ad7ca806c633a0d900e78bc2e0) Thanks [@imsanchez](https://github.com/imsanchez)! - Fix the Analytics and Revenue admin runtimes, keep merchant semantic colors WCAG AA compliant through shared hover states, keep product-list controls and table columns reachable on narrow screens, send valid volume-pricing requests from product pages, preserve review photo and search synonym arrays through compiled storage with valid PostgreSQL array constraints, align search synonym rows across supported viewports, keep compiled reads and transactional row locks deterministic without recursion, and request pickup windows only after a shopper selects a location.
