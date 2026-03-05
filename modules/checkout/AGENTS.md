# Checkout Module

Checkout session management: cart-to-order conversion flow. Handles session creation, address collection, discount application, and order completion. Customer-facing only — no admin endpoints.

## Structure

```
src/
  index.ts          Factory: checkout(options?) => Module
  schema.ts         Zod models: checkoutSession, checkoutLineItem
  service.ts        CheckoutController + DiscountController (local minimal interface) + types
  service-impl.ts   CheckoutController implementation
  endpoints/
    store/          Customer-facing
      create-session.ts             POST /checkout/sessions
      get-session.ts                GET  /checkout/sessions/:id
      update-session.ts             PUT  /checkout/sessions/:id/update
      apply-discount.ts             POST /checkout/sessions/:id/discount
  __tests__/
    service-impl.test.ts    23 tests
```

## Options

```ts
CheckoutOptions {
  sessionTtl?: number   // default 1800000 (30 minutes)
  currency?: string     // default "USD"
}
```

## Data models

- **checkoutSession**: id, cartId?, customerId?, guestEmail?, status, subtotal, taxAmount, shippingAmount, discountAmount, total, currency, discountCode?, shippingAddress (JSON)?, billingAddress (JSON)?, paymentMethod?, orderId?, metadata, expiresAt, createdAt, updatedAt
- **checkoutLineItem**: productId, variantId?, name, sku?, price, quantity — stored with composite key `{sessionId}_{productId}[_{variantId}]`

## Session statuses

`pending → processing → completed`
`pending → expired` (via `expireStale()`)
`pending/processing → abandoned`

## Exports (for inter-module contracts)

Types exported: `CheckoutSession`, `CheckoutController`, `CheckoutAddress`, `CheckoutLineItem`, `CheckoutStatus`, `DiscountController`

## Patterns

- **Inter-module isolation**: defines a local minimal `DiscountController` interface (structural typing). Checkout accesses `ctx.context.controllers.discount` at runtime — no direct import from discounts module.
- `getLineItems` strips the internal `sessionId` field before returning results
- `update` recalculates total when `shippingAmount` changes; blocks on completed/expired sessions
- `applyDiscount` handles `freeShipping: true` by zeroing `shippingAmount`; clamps total to 0
- `removeDiscount` restores `subtotal + taxAmount + shippingAmount` total
- `complete` only transitions from `pending` status; stores `orderId`
- `expireStale` scans only `pending` sessions; use negative TTL (e.g. `ttl: -60_000`) in tests to guarantee past expiry
- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`
- `findMany` uses `take` (not `limit`) for the options API
