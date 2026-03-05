# Braintree Module

Braintree payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`.

## Usage

```ts
import { BraintreePaymentProvider } from "@86d-app/braintree";
import payments from "@86d-app/payments";

const provider = new BraintreePaymentProvider(
  "merchant_id",
  "public_key",
  "private_key",
  true, // sandbox
);
const paymentsModule = payments({ currency: "USD", provider });
```

## API Mapping

| PaymentProvider method | Braintree API endpoint |
|---|---|
| `createIntent` | `POST /merchants/{id}/transactions` (submit_for_settlement: false) |
| `confirmIntent` | `POST /merchants/{id}/transactions/{txId}/submit_for_settlement` |
| `cancelIntent` | `POST /merchants/{id}/transactions/{txId}/void` |
| `createRefund` | `POST /merchants/{id}/transactions/{txId}/refunds` |

## Status Mapping

| Braintree status | Provider status |
|---|---|
| `settled` | `succeeded` |
| `voided` | `cancelled` |
| `submitted_for_settlement`, `settling` | `processing` |
| `failed`, `processor_declined`, `gateway_rejected` | `failed` |
| `authorized` | `pending` |

## Webhook

`POST /braintree/webhook` — receives Braintree webhook events (uses `kind` field). Returns `{ received: true, type }`.

## Notes

- Amounts are in cents in the PaymentProvider interface but Braintree uses decimal strings (e.g. "10.00")
- `createIntent` accepts `metadata.paymentMethodNonce` for the Braintree payment nonce (provided by client-side Braintree.js)
- Sandbox mode: pass `true` as the 4th constructor argument or use the `sandbox: "true"` option
