# Checkout Module

Checkout session management: cart-to-order conversion flow. Handles session creation, address collection, discount application, payment coordination, and authoritative Order creation. It has customer-facing endpoints plus bounded Store Admin maintenance endpoints.

## Structure

```
src/
  index.ts          Factory and accepted capability metadata
  schema.ts         Zod models: checkoutSession, checkoutLineItem
  service.ts        Checkout-owned controller and types
  service-impl.ts   Checkout-owned controller implementation
  store/endpoints/  Customer-facing Checkout HTTP surface
  admin/endpoints/  Store Admin inspection and stale-session expiry
  __tests__/        Service, endpoint, containment, and capability integration tests
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

## Capability boundary

Product and variant resolution plus Order creation are required capabilities. Inventory, Tax, Shipping, Discount, Gift Card, Store Credit, Payment, Price List, and currency conversion are explicit optional integrations whose call sites return bounded unavailability or domain failures. Checkout never receives another Module's data service or controller.

M0 activation containment remains in force: confirm, payment, capture, payment-status, and completion routes return `CHECKOUT_ACTIVATION_UNAVAILABLE`. The consumer operation grants cover only currently reachable decisions (`check`/`release`, validation/balance reads, and payment cancellation); duplicate-sensitive commit, redeem, debit, reserve, deduct, create, get, and confirm operations are not granted to Checkout.

## Patterns

- **Inter-module isolation**: immediate decisions use `ctx.context.capabilities`; `ctx.context.controllers.checkout` is owner-local compatibility access only.
- Missing authoritative Product or Order capabilities prevent Module initialization. Optional capability absence is explicit and required decisions fail closed at the endpoint.
- `getLineItems` strips the internal `sessionId` field before returning results
- `update` recalculates total when `shippingAmount` changes; blocks on completed/expired sessions
- `applyDiscount` handles `freeShipping: true` by zeroing `shippingAmount`; clamps total to 0
- `removeDiscount` restores `subtotal + taxAmount + shippingAmount` total
- `complete` only transitions from `pending` status; stores `orderId`
- `expireStale` scans only `pending` sessions; use negative TTL (e.g. `ttl: -60_000`) in tests to guarantee past expiry
- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`
- `findMany` uses `take` (not `limit`) for the options API
