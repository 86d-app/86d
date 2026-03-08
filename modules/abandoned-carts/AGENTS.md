# Abandoned Carts Module

Tracks abandoned shopping carts and manages multi-channel recovery campaigns (email, SMS, push).

## Structure

```
src/
  index.ts          Factory: abandonedCarts(options?) => Module
  schema.ts         Zod models: abandonedCart, recoveryAttempt
  service.ts        AbandonedCartController interface + types
  service-impl.ts   AbandonedCartController implementation
  store/
    components/     Cart recovery MDX + TSX components
    endpoints/
      track-abandoned.ts       POST /abandoned-carts/track
      recover-cart.ts           GET  /abandoned-carts/recover/:token
  admin/
    components/     Abandoned cart overview MDX + TSX
    endpoints/
      list-abandoned.ts         GET    /admin/abandoned-carts
      get-stats.ts              GET    /admin/abandoned-carts/stats
      bulk-expire.ts            POST   /admin/abandoned-carts/bulk-expire
      get-abandoned.ts          GET    /admin/abandoned-carts/:id
      send-recovery.ts          POST   /admin/abandoned-carts/:id/recover
      dismiss-cart.ts           POST   /admin/abandoned-carts/:id/dismiss
      delete-abandoned.ts       DELETE /admin/abandoned-carts/:id/delete
```

## Options

```ts
AbandonedCartOptions {
  abandonmentThresholdMinutes?: number  // default 60
  maxRecoveryAttempts?: number          // default 3
  expirationDays?: number              // default 30
}
```

## Data models

- **abandonedCart**: id, cartId, customerId?, email?, items (JSON snapshot), cartTotal, currency, status (active|recovered|expired|dismissed), recoveryToken, attemptCount, lastActivityAt, abandonedAt, recoveredAt?, recoveredOrderId?, metadata
- **recoveryAttempt**: id, abandonedCartId (FK), channel (email|sms|push), recipient, status (sent|delivered|opened|clicked|failed), subject?, openedAt?, clickedAt?, sentAt

## Patterns

- Requires `cart` module (reads cartItems, cartTotal) and `customers` module (reads customerEmail)
- Recovery uses unique token per cart — store endpoint `/abandoned-carts/recover/:token` looks up by token
- `bulkExpire(olderThanDays)` batch-expires active carts older than threshold
- Emits events: cart.abandoned, cart.recoveryAttempted, cart.recovered, cart.expired, cart.dismissed
- Deleting a cart cascades to its recovery attempts (manual loop, not DB cascade)
- Stats computed in-memory by iterating all carts (no aggregate queries)
