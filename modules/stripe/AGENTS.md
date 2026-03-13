# Stripe Module

Stripe payment provider for @86d-app/payments. Implements the `PaymentProvider` interface using raw fetch to Stripe's REST API — no Stripe SDK required.

## Structure

```
src/
  index.ts              Factory: stripe(options) => Module + admin nav
  provider.ts           StripePaymentProvider class (PaymentProvider interface)
  mdx.d.ts              MDX module type declaration
  store/
    endpoints/
      index.ts          Store endpoint exports
      webhook.ts        POST /stripe/webhook — HMAC-SHA256 signature verification
  admin/
    endpoints/
      index.ts          Admin endpoint exports
      get-settings.ts   GET /admin/stripe/settings — masked credentials
    components/
      index.tsx         Component exports
      stripe-admin.tsx  "use client" admin dashboard
      stripe-admin.mdx  Admin page template
  __tests__/
    provider.test.ts          20 tests (provider methods, status mapping, error handling)
    webhook.test.ts           16 tests (signature verification, event handling, domain events)
    endpoint-security.test.ts 27 tests (replay protection, payload safety, refund extraction)
    admin-settings.test.ts    20 tests (key masking, mode detection, config status)
    module-factory.test.ts    12 tests (module identity, options, admin pages, endpoints)
```

## Options

```ts
StripeOptions {
  apiKey: string            // sk_live_... or sk_test_...
  webhookSecret?: string    // whsec_... for signature verification
}
```

## Status mapping

| Stripe status | Provider status |
|---|---|
| succeeded | succeeded |
| canceled | cancelled |
| processing, requires_capture | processing |
| requires_payment_method, requires_confirmation, requires_action | pending |

## Webhook

- Signature: HMAC-SHA256 via Web Crypto API, timing-safe comparison
- Replay protection: 5-minute timestamp tolerance
- Event map: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.succeeded`, `charge.failed`
- Refund events: `charge.refunded`, `charge.dispute.funds_withdrawn`
- Domain events emitted: `payment.completed`, `payment.failed`, `payment.refunded`

## Patterns

- Without `webhookSecret` all requests accepted (dev mode)
- Admin endpoint masks API keys (first 7 chars visible)
- Admin detects key mode: `sk_live_` → "live", `sk_test_` → "test"
- Tests mock `globalThis.fetch` — no real Stripe calls
