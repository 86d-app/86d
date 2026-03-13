# payments module

Provider-agnostic payment processing. Tracks payment intents, saved payment methods, and refunds. Delegates processing to a configurable `PaymentProvider` (Stripe, Square, PayPal, etc.).

## File structure

```
src/
  index.ts              Module definition, PaymentsOptions
  schema.ts             paymentIntent, paymentMethod, refund entities
  service.ts            PaymentController, PaymentProvider, type definitions
  service-impl.ts       createPaymentController(data, provider?) factory
  store/endpoints/      6 customer-facing endpoints
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

- **Amount**: Always in smallest currency unit (cents). Must be a positive integer at controller level.
- **Status machine**: `pending → processing → succeeded → refunded`. Terminal states: `cancelled`, `failed`, `refunded`.
- **Status guards**: `confirmIntent` only from pending/processing. `cancelIntent` only from pending/processing. `createRefund` only from succeeded/refunded.
- **Refund cap**: Cumulative non-failed refunds cannot exceed original intent amount. Controller calculates `totalRefunded()` before each refund.
- **Webhook dedup**: `handleWebhookRefund` deduplicates by `providerRefundId` — retries return the existing refund.
- **Default payment method**: Only one per customer. `savePaymentMethod(isDefault: true)` clears previous defaults.
- **Ownership**: Controller has no ownership checks — endpoints must verify `session.user.id === intent.customerId`.
- **Provider delegation**: If provider configured, delegates to it for createIntent/confirmIntent/cancelIntent/createRefund. Without provider, operates in local mode.

## Data models

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
