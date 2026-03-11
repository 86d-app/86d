# Fulfillment Module

Shipment lifecycle management with a 5-state machine. Handles creation, status transitions, tracking, cancellation, and optional auto-ship on tracking.

## Structure

```
src/
  index.ts          Factory: fulfillment(options?) => Module
  schema.ts         ModuleSchema: fulfillment entity
  service.ts        FulfillmentController interface + types
  service-impl.ts   FulfillmentController implementation (7 methods)
  store/
    endpoints/      Customer-facing (read-only, filtered fields)
      get-fulfillment.ts          GET /fulfillment/:id
      list-by-order.ts            GET /fulfillment/order/:orderId
    components/     FulfillmentTracker, FulfillmentSummary, TrackingInfo
  admin/
    endpoints/      Protected
      list-fulfillments.ts        GET  /admin/fulfillment
      create-fulfillment.ts       POST /admin/fulfillment/create
      get-fulfillment.ts          GET  /admin/fulfillment/:id
      update-status.ts            POST /admin/fulfillment/:id/status
      add-tracking.ts             POST /admin/fulfillment/:id/tracking
      cancel-fulfillment.ts       POST /admin/fulfillment/:id/cancel
      list-by-order.ts            GET  /admin/fulfillment/order/:orderId
    components/     FulfillmentAdmin
  __tests__/
    service-impl.test.ts          67 tests (transitions, events, autoShip, lifecycle)
    controllers.test.ts           51 tests (edge cases, isolation, event emission)
```

## Options

```ts
FulfillmentOptions {
  autoShipOnTracking?: boolean  // Auto-transition pending/processing → shipped when tracking added
}
```

## Data models

- **fulfillment**: id, orderId, status (pending|processing|shipped|delivered|cancelled), items (JSON: [{lineItemId, quantity}]), carrier?, trackingNumber?, trackingUrl?, notes?, shippedAt?, deliveredAt?, createdAt, updatedAt

## Status state machine

```
pending → processing → shipped → delivered
  ↓          ↓           ↓
  └──────────┴───────────┴──→ cancelled
```

- `delivered` and `cancelled` are terminal — no transitions out
- `shippedAt` auto-set on → shipped; `deliveredAt` on → delivered
- Invalid transitions throw an Error
- `cancelFulfillment` is idempotent — returns existing if already cancelled
- Cannot cancel delivered fulfillments (throws)

## Key patterns

- Requires `orders` module (reads orderDetails, orderItems)
- Items stored as JSON array (not separate entity)
- `createFulfillment` throws if items array is empty
- Store endpoints strip `notes` and `updatedAt` from responses
- `autoShipOnTracking` only applies to pending/processing fulfillments
- Events emitter is optional — controller works without it (graceful no-op)

## Events emitted

`fulfillment.created`, `fulfillment.shipped`, `fulfillment.delivered`, `fulfillment.cancelled`

## Gotchas

- `exactOptionalPropertyTypes` is on — use `| undefined` for optional interface fields
- Admin endpoints use POST for mutations (not PUT) despite REST conventions
- notes field is admin-only — store endpoints strip it from responses
