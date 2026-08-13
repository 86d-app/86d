# payments module

Provider-neutral payment ownership. The legacy v1 controller tracks payment intents, saved payment methods, and refunds. The additive v2 boundary owns named Payment Connections and durable connection-bound provider operations without exposing live shopper routes.

## File structure

```
src/
  index.ts              Module definition, PaymentsOptions
  schema.ts             legacy entities plus v2 Connections and operations
  connection-service.ts Named Connection lifecycle and durable operation service
  service.ts            PaymentController, PaymentProvider, type definitions
  service-impl.ts       createPaymentController(data, provider?) factory
  store/endpoints/      saved-method endpoints; generic intent routes contained
  admin/endpoints/      4 admin endpoints
  admin/components/     PaymentsAdmin UI (intents table, refund modal)
  __tests__/
    service-impl.test.ts      Core CRUD (47 tests)
    controllers.test.ts       Edge cases (65 tests)
    edge-cases.test.ts        Provider, webhook, filter edge cases (32 tests)
    endpoint-security.test.ts Security regressions (26 tests)
    financial-safety.test.ts  Amount validation, status guards, refund cap, webhook dedup (35 tests)
```

## Key patterns

- **Payment Connection v2**: Store-scoped, named, immutable identity with provider, mode, capabilities, health, lifecycle, and an opaque server-only secret reference.
- **Explicit routing**: A v2 adapter is bound to exactly one `connectionId`; no default provider or provider fallback exists in the v2 service.
- **Operation identity**: Every provider operation persists its immutable Connection, operation-specific idempotency key, request digest, attempt history, provider reference, and final/ambiguous state before and after the external call.
- **Reversal routing**: Capture, refund, and void must cite a succeeded source operation and its provider reference, so they retain the original Connection.
- **Containment**: v2 has owner-local production exports only. It is not registered as a shopper endpoint or as the legacy Checkout payment capability.
- **Transactions**: Connection and operation writes fail closed unless the host supplies an owner-local locking transaction runner.

Legacy v1 migration behavior follows:

- **Amount**: Always in smallest currency unit (cents). Must be a positive integer at controller level.
- **Status machine**: `pending → processing → succeeded → refunded`. Terminal states: `cancelled`, `failed`, `refunded`.
- **Status guards**: `confirmIntent` only from pending/processing. `cancelIntent` only from pending/processing. `createRefund` only from succeeded/refunded.
- **Refund cap**: Cumulative non-failed refunds cannot exceed original intent amount. Controller calculates `totalRefunded()` before each refund.
- **Webhook dedup**: `handleWebhookRefund` deduplicates by `providerRefundId` — retries return the existing refund.
- **Default payment method**: Only one per customer. `savePaymentMethod(isDefault: true)` clears previous defaults.
- **Ownership**: Controller has no ownership checks — endpoints must verify `session.user.id === intent.customerId`.
- **Provider delegation**: A manually configured legacy provider can still serve v1 internal consumers during migration. Missing provider fails closed for confirmation and refund outside explicit non-production development mode.

## Data models

- **paymentConnection**: id, unique normalized name, provider, mode, capabilities, health, lifecycle, opaque secret reference, lifecycle timestamps
- **paymentOperationV2**: payment and source references, immutable connectionId, operation-specific idempotency key, request digest, attempt, provider reference, outcome, ambiguous/needs-attention state
- **paymentOperationAttemptV2**: immutable per-call attempt history

- **paymentIntent**: id, providerIntentId?, customerId?, email?, amount, currency, status, orderId?, checkoutSessionId?, metadata, providerMetadata, timestamps
- **paymentMethod**: id, customerId, providerMethodId, type, last4?, brand?, expiryMonth?, expiryYear?, isDefault, timestamps
- **refund**: id, paymentIntentId, providerRefundId, amount, reason?, status (pending|succeeded|failed), timestamps

## Events emitted

`payment.completed`, `payment.failed`, `payment.refunded`

## Gotchas

- Endpoint validates `amount` as `z.number().int().positive()` — controller also validates (defense in depth).
- `createRefund` throws on non-existent intent, wrong status, exceeded cap, or missing provider. Endpoints should catch and return structured errors.
- `handleWebhookEvent` has no status guards — it trusts the provider (Stripe can set any status). `handleWebhookRefund` deduplicates but doesn't cap amounts (provider-side refunds are authoritative).
- Admin refund endpoint checks intent existence before calling controller, but doesn't validate intent status — controller handles that.

## Tests (205 total)

Run: `bun test` from this directory. All 5 test files cover: CRUD, status guards, refund cap, webhook dedup, provider delegation, customer isolation, pagination.
