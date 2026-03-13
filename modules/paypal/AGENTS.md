# PayPal Module

PayPal payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`.

## Structure

```
src/
  index.ts              Factory: paypal(options) => Module + admin nav
  provider.ts           PayPalPaymentProvider class (OAuth2 + REST API)
  mdx.d.ts              MDX module type declaration
  store/
    endpoints/
      index.ts          Store endpoint exports
      webhook.ts        POST /paypal/webhook — PayPal signature verification via API
  admin/
    endpoints/
      index.ts          Admin endpoint exports
      get-settings.ts   GET /admin/paypal/settings — masked credentials
    components/
      index.tsx         Component exports
      paypal-admin.tsx  "use client" admin dashboard
      paypal-admin.mdx  Admin page template
  __tests__/
    provider.test.ts          25 tests (OAuth, intent lifecycle, status mapping, refunds)
    webhook.test.ts           15 tests (signature verification, event handling)
    endpoint-security.test.ts 27 tests (header validation, event filtering, refund integrity)
    admin-settings.test.ts    22 tests (key masking, mode detection, config status)
    module-factory.test.ts    18 tests (module identity, options, admin pages, endpoints)
```

## Options

```ts
PayPalOptions {
  clientId: string          // PayPal app client ID
  clientSecret: string      // PayPal app client secret
  sandbox?: string          // "true" or "1" for sandbox
  webhookId?: string        // Webhook ID for signature verification
}
```

## Authentication

OAuth2 client credentials flow. Tokens cached with 60-second expiry buffer.

## API Mapping

| Method | PayPal endpoint |
|---|---|
| createIntent | POST /v2/checkout/orders (intent: AUTHORIZE) |
| confirmIntent | POST /v2/checkout/orders/{id}/capture |
| cancelIntent | GET /v2/checkout/orders/{id} (orders expire naturally) |
| createRefund | GET order → extract captureId → POST /v2/payments/captures/{id}/refund |

## Status mapping

| PayPal status | Provider status |
|---|---|
| COMPLETED | succeeded |
| VOIDED | cancelled |
| APPROVED | processing |
| CREATED, SAVED, PAYER_ACTION_REQUIRED | pending |

## Webhook

- PayPal uses RSA signatures verified via REST API (not local crypto)
- Requires all 5 transmission headers or verification fails
- Event map: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.PENDING`, `CHECKOUT.ORDER.APPROVED`
- Refund events: `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.SALE.REFUNDED`
- Without `webhookId` all requests accepted (dev mode)

## Patterns

- Amounts: cents in PaymentProvider interface → dollars in PayPal API (formatAmount)
- Sandbox URL: `api-m.sandbox.paypal.com` vs `api-m.paypal.com`
- Admin endpoint masks credentials (first 7 chars visible)
- Tests mock `globalThis.fetch` — no real PayPal calls
