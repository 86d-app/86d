# stripe module

Stripe payment provider for @86d-app/payments. Implements the `PaymentProvider` interface using raw fetch to Stripe's REST API — no Stripe SDK required.

## Usage

```ts
import payments from "@86d-app/payments";
import stripe, { StripePaymentProvider } from "@86d-app/stripe";

const provider = new StripePaymentProvider("sk_test_...");

createModule([
  payments({ provider }),
  stripe({ apiKey: "sk_test_..." }), // for webhook endpoint
]);
```

## StripePaymentProvider

Implements `PaymentProvider` from `@86d-app/payments`:
- `createIntent(params)` → calls `POST /v1/payment_intents`
- `confirmIntent(providerIntentId)` → calls `POST /v1/payment_intents/:id/confirm`
- `cancelIntent(providerIntentId)` → calls `POST /v1/payment_intents/:id/cancel`
- `createRefund(params)` → calls `POST /v1/refunds`

## Status mapping

| Stripe status | PaymentProvider status |
|---|---|
| succeeded | succeeded |
| canceled | cancelled |
| processing | processing |
| requires_payment_method | pending |
| requires_confirmation | pending |
| requires_action | pending |

## Webhook endpoint

`POST /stripe/webhook` — receives Stripe webhook events. Returns `{ received: true, type }`.
Signature verification requires the raw request body — implement at the adapter level using `webhookSecret`.

## Tests

Tests mock global `fetch` via `vi.stubGlobal`. No real Stripe API calls are made.
Run: `bun test` from this directory.
