# Fulfillment Module

Manages order fulfillment lifecycle including item packing, shipment tracking, and delivery confirmation.

## Structure

```
src/
  index.ts          Factory: fulfillment(options?) => Module
  schema.ts         Zod models: fulfillment
  service.ts        FulfillmentController interface + types
  service-impl.ts   FulfillmentController implementation
  store/
    components/     Fulfillment tracker, summary, tracking info MDX + TSX
    endpoints/
      get-fulfillment.ts     GET  /fulfillment/:id
      list-by-order.ts       GET  /fulfillment/order/:orderId
  admin/
    components/     Fulfillment admin MDX + TSX
    endpoints/
      list-fulfillments.ts   GET    /admin/fulfillment
      create-fulfillment.ts  POST   /admin/fulfillment/create
      get-fulfillment.ts     GET    /admin/fulfillment/:id
      update-status.ts       PUT    /admin/fulfillment/:id/status
      add-tracking.ts        PUT    /admin/fulfillment/:id/tracking
      cancel-fulfillment.ts  POST   /admin/fulfillment/:id/cancel
      list-by-order.ts       GET    /admin/fulfillment/order/:orderId
```

## Options

```ts
FulfillmentOptions {
  autoShipOnTracking?: boolean  // auto-set status to "shipped" when tracking added
}
```

## Data models

- **fulfillment**: id, orderId, status (pending|processing|shipped|delivered|cancelled), items (JSON array of {lineItemId, quantity}), carrier?, trackingNumber?, trackingUrl?, notes?, shippedAt?, deliveredAt?, createdAt, updatedAt

## Patterns

- Requires `orders` module (reads orderDetails, orderItems)
- Single schema entity — items stored as JSON array, not a separate table
- Status transitions: pending -> processing -> shipped -> delivered (or cancelled from any state)
- `shippedAt` set when status moves to "shipped"; `deliveredAt` set when "delivered"
- Events: fulfillment.created, fulfillment.shipped, fulfillment.delivered, fulfillment.cancelled
- Store exposes read-only endpoints; all mutations are admin-only
