# Wish Module

Integrates with Wish marketplace for product listing, order management, and shipment tracking.

## Structure

```
src/
  index.ts          Factory: wish(options?) => Module + admin nav (Sales > Wish)
  schema.ts         Zod models: wishProduct, wishOrder
  service.ts        WishController interface
  service-impl.ts   WishController implementation via ModuleDataService
  store/endpoints/  (empty)
  admin/endpoints/  (empty)
  admin/components/ index.tsx, wish-admin.tsx, wish-admin.mdx
  __tests__/        (none)
```

## Options

```ts
interface WishOptions extends ModuleConfig {
  accessToken?: string;  // Wish API access token
  merchantId?: string;   // Wish merchant ID
}
```

## Data Models

- **WishProduct** -- id, localProductId, wishProductId, title, status (active|disabled|pending-review|rejected), price, shippingPrice, quantity, parentSku, tags[], lastSyncedAt, reviewStatus, error
- **WishOrder** -- id, wishOrderId, status (pending|approved|shipped|delivered|refunded|cancelled), items, orderTotal, shippingTotal, wishFee, customerName, shippingAddress, trackingNumber, carrier, shipByDate, deliverByDate
- **ChannelStats** -- totalProducts, activeProducts, totalOrders, totalRevenue, pendingShipments, disabledProducts

## Patterns

- Controller key: `wish`
- Events emitted: `wish.product.synced`, `wish.product.disabled`, `wish.order.received`, `wish.order.shipped`, `wish.refund.created`
- Exports read fields: `wishProductTitle`, `wishProductStatus`, `wishProductPrice`, `wishProductId`
- `disableProduct()` sets status to `disabled`
- `getPendingShipments()` returns orders with `approved` status ordered by creation date (oldest first)
- pendingShipments stat counts orders with `pending` or `approved` status
- No store or admin endpoints are wired yet (both empty objects)
