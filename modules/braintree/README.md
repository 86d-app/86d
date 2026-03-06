<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# Braintree Module

Braintree payment provider for 86d stores. Implements the `PaymentProvider` interface from `@86d-app/payments` using the Braintree REST API (no SDK dependency).

## Installation

```ts
import payments from "@86d-app/payments";
import braintree, { BraintreePaymentProvider } from "@86d-app/braintree";
import { createStore } from "@86d-app/core";

const provider = new BraintreePaymentProvider(
  "your_merchant_id",
  "your_public_key",
  "your_private_key",
);

const store = createStore({
  modules: [
    payments({ provider }),
    braintree({
      merchantId: "your_merchant_id",
      publicKey: "your_public_key",
      privateKey: "your_private_key",
    }),
  ],
});
```

## Options

| Option | Type | Required | Description |
|---|---|---|---|
| `merchantId` | `string` | Yes | Braintree merchant ID |
| `publicKey` | `string` | Yes | Braintree public API key |
| `privateKey` | `string` | Yes | Braintree private API key |
| `sandbox` | `string` | No | Pass `"true"` to use the sandbox environment |

## Sandbox Mode

```ts
const provider = new BraintreePaymentProvider(
  merchantId,
  publicKey,
  privateKey,
  true, // sandbox
);
```

Sandbox base URL: `https://api.sandbox.braintreegateway.com`
Production base URL: `https://api.braintreegateway.com`

## Store Endpoints

### Webhook

```
POST /braintree/webhook
```

Receives Braintree webhook notifications. Returns `{ received: true, kind }`.

## API Mapping

| PaymentProvider method | Braintree API |
|---|---|
| `createIntent` | `POST /merchants/{id}/transactions` (authorize only, `submit_for_settlement: false`) |
| `confirmIntent` | `POST /merchants/{id}/transactions/{txId}/submit_for_settlement` |
| `cancelIntent` | `POST /merchants/{id}/transactions/{txId}/void` |
| `createRefund` | `POST /merchants/{id}/transactions/{txId}/refunds` |

## Status Mapping

| Braintree Status | PaymentProvider Status |
|---|---|
| `settled` | `succeeded` |
| `voided` | `cancelled` |
| `submitted_for_settlement`, `settling`, `settlement_pending`, `settlement_confirmed` | `processing` |
| `failed`, `processor_declined`, `gateway_rejected`, `settlement_declined` | `failed` |
| `authorized` | `pending` |

## Authentication

Uses HTTP Basic auth: `Authorization: Basic base64(publicKey:privateKey)` with `Braintree-Version: 2019-01-01`.

## Amounts

Amounts are passed in cents (integers) and converted to decimal strings for the Braintree API (e.g., `1000` → `"10.00"`).

## Payment Method Nonce

`createIntent` uses a `paymentMethodNonce` from `metadata`. In production, obtain this from the Braintree Drop-in UI or client SDK:

```ts
await paymentsController.createIntent({
  amount: 1999,
  currency: "USD",
  metadata: { paymentMethodNonce: "nonce-from-client" },
});
```
