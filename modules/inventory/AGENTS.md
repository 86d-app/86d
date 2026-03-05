# Inventory Module

Stock tracking for products and variants. Manages on-hand quantity, reservations, backorder support, and low-stock alerts. Standalone — integrates with products conceptually but has no direct module imports.

## Structure

```
src/
  index.ts          Factory: inventory(options?) => Module
  schema.ts         Model: inventoryItem
  service.ts        InventoryController interface + types
  service-impl.ts   InventoryController implementation
  endpoints/
    store/          Customer-facing
      check-stock.ts        GET  /inventory/check?productId&variantId&locationId&quantity
    admin/          Protected (store admin only)
      list-items.ts         GET  /admin/inventory
      set-stock.ts          POST /admin/inventory/set
      adjust-stock.ts       POST /admin/inventory/adjust
      low-stock.ts          GET  /admin/inventory/low-stock
  __tests__/
    service-impl.test.ts    27 tests
```

## Data model

- **inventoryItem**: id (composite key), productId, variantId?, locationId?, quantity, reserved, available (computed), lowStockThreshold?, allowBackorder, createdAt, updatedAt

## Composite key

Items are identified by a composite key: `productId:variantId:locationId`, using `_` as a placeholder for missing segments.

Examples:
- `prod_1:_:_` — product-level, no variant, no location
- `prod_1:var_1:_` — specific variant
- `prod_1:_:loc_1` — product at a specific location

## Exports (for inter-module contracts)

Types exported: `InventoryItem`, `InventoryController`

## Patterns

- `available` is computed: `Math.max(0, quantity - reserved)` — never negative
- `isInStock` returns `true` if no tracking record exists (unmanaged product = always in stock)
- `setStock` preserves existing `reserved` when updating quantity
- `reserve` returns `null` if available < requested quantity AND `allowBackorder` is false
- `deduct` decrements both `quantity` and `reserved` (called at fulfillment/shipment)
- `adjustStock` applies a signed delta (positive = restock, negative = shrinkage); returns `null` if item not found
- `getLowStockItems` returns items where `available <= lowStockThreshold` (only items WITH a threshold set)
- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`
- `findMany` uses spread pattern for optional take/skip to satisfy exactOptionalPropertyTypes:
  ```ts
  ...(params?.take !== undefined ? { take: params.take } : {}),
  ...(params?.skip !== undefined ? { skip: params.skip } : {}),
  ```
