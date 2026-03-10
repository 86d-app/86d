# Fulfillment Module

Manages order fulfillment lifecycle including item packing, shipment tracking, and delivery confirmation.

## Structure

```
src/
  index.ts          Factory: fulfillment(options?) => Module
  schema.ts         ModuleSchema: fulfillment entity
  service.ts        FulfillmentController interface + types
  service-impl.ts   FulfillmentController implementation (events, autoShipOnTracking)
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
      update-status.ts       POST   /admin/fulfillment/:id/status
      add-tracking.ts        POST   /admin/fulfillment/:id/tracking
      cancel-fulfillment.ts  POST   /admin/fulfillment/:id/cancel
      list-by-order.ts       GET    /admin/fulfillment/order/:orderId
  __tests__/
    service-impl.test.ts     67 tests covering controller, events, autoShipOnTracking, lifecycle
```

## Options

```ts
FulfillmentOptions {
  autoShipOnTracking?: boolean  // auto-set status to "shipped" when tracking added (pending/processing only)
}
```

## Data models

- **fulfillment**: id, orderId, status (pending|processing|shipped|delivered|cancelled), items (JSON array of {lineItemId, quantity}), carrier?, trackingNumber?, trackingUrl?, notes?, shippedAt?, deliveredAt?, createdAt, updatedAt

## Status state machine

```
pending → processing → shipped → delivered
  ↓          ↓           ↓
  └──────────┴───────────┴──→ cancelled
```

- `delivered` and `cancelled` are terminal — no transitions out
- `shippedAt` auto-set on transition to "shipped"; `deliveredAt` on "delivered"

## Events

All events are fire-and-forget (`void events.emit(...)`) and include `fulfillmentId` + `orderId`:

- `fulfillment.created` — on creation (includes items array)
- `fulfillment.shipped` — on status → shipped (includes carrier, trackingNumber)
- `fulfillment.delivered` — on status → delivered
- `fulfillment.cancelled` — on status → cancelled (via updateStatus or cancelFulfillment)

Events require `ScopedEventEmitter` from `ModuleContext.events`. Controller works without events (graceful no-op).

## Patterns

- Requires `orders` module (reads orderDetails, orderItems)
- Single schema entity — items stored as JSON array, not a separate table
- Store exposes read-only endpoints; all mutations are admin-only
- Endpoints return `{ error, status: 404 }` for not-found (not throw)
- `cancelFulfillment` is idempotent — returns existing if already cancelled
- `addTracking` auto-transitions to "shipped" when `autoShipOnTracking: true` (pending/processing only)

## Gotchas

- `exactOptionalPropertyTypes` is on — use `| undefined` for optional interface fields
- Admin endpoints use POST for mutations (not PUT) despite REST conventions
- notes field is admin-only — store endpoints strip notes and updatedAt from responses
