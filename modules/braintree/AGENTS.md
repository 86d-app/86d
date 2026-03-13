# Braintree Module

Braintree payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`.

## Structure

```
src/
  index.ts              Factory: braintree(options) => Module + admin nav
  provider.ts           BraintreePaymentProvider class (Basic auth)
  mdx.d.ts              MDX module type declaration
  store/
    endpoints/
      index.ts          Store endpoint exports
      webhook.ts        POST /braintree/webhook — HMAC-SHA1 signature verification
  admin/
    endpoints/
      index.ts          Admin endpoint exports
      get-settings.ts   GET /admin/braintree/settings — masked credentials
    components/
      index.tsx         Component exports
      braintree-admin.tsx  "use client" admin dashboard
      braintree-admin.mdx  Admin page template
  __tests__/
    provider.test.ts          38 tests (transaction lifecycle, 11 status mappings, auth, sandbox)
    webhook.test.ts           15 tests (HMAC verification, XML parsing, event handling)
    endpoint-security.test.ts 22 tests (signature security, kind filtering, amount integrity)
    admin-settings.test.ts    22 tests (key masking, mode detection, 3-key config check)
    module-factory.test.ts    18 tests (module identity, options, admin pages, endpoints)
```

## Options

```ts
BraintreeOptions {
  merchantId: string      // Braintree merchant ID
  publicKey: string       // API public key
  privateKey: string      // API private key
  sandbox?: string        // "true" or "1" for sandbox
}
```

## API Mapping

| Method | Braintree endpoint |
|---|---|
| createIntent | POST /merchants/{id}/transactions (submit_for_settlement: false) |
| confirmIntent | POST /merchants/{id}/transactions/{txId}/submit_for_settlement |
| cancelIntent | POST /merchants/{id}/transactions/{txId}/void |
| createRefund | POST /merchants/{id}/transactions/{txId}/refunds |

## Status mapping

| Braintree status | Provider status |
|---|---|
| settled | succeeded |
| voided | cancelled |
| submitted_for_settlement, settling, settlement_pending, settlement_confirmed | processing |
| failed, processor_declined, gateway_rejected, settlement_declined | failed |
| authorized | pending |

## Webhook

- HMAC-SHA1 signature verification with timing-safe comparison
- `bt_signature` format: `PUBLIC_KEY|HEX_HMAC_SHA1`
- XML payload (base64 encoded)
- Event kinds: `transaction_settled`, `transaction_disbursed`, `transaction_settlement_declined`
- Refund detection: `<type>credit</type>` or `<refunded-transaction-id>` markers
- Domain events: `payment.completed`, `payment.failed`, `payment.refunded`

## Patterns

- Requires `metadata.paymentMethodNonce` for createIntent (from client-side Braintree.js)
- Amounts: cents in PaymentProvider → decimal strings in Braintree API (formatAmount)
- Auth: Basic auth header (`publicKey:privateKey` base64-encoded)
- Sandbox URL: `api.sandbox.braintreegateway.com` vs `api.braintreegateway.com`
- `configured` requires all three keys (merchantId + publicKey + privateKey)
- Tests mock `globalThis.fetch` — no real Braintree calls
