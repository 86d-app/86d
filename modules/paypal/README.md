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

# @86d-app/paypal

PayPal payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`. Uses PayPal Orders API v2 via raw `fetch()` with OAuth2 client credentials — no PayPal SDK required.

## Installation

```ts
import { PayPalPaymentProvider } from "@86d-app/paypal";
import payments from "@86d-app/payments";

const provider = new PayPalPaymentProvider("CLIENT_ID", "CLIENT_SECRET");
const paymentsModule = payments({ currency: "USD", provider });
```

## Options

```ts
import paypal from "@86d-app/paypal";

const paypalModule = paypal({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  sandbox: "true",       // optional — use sandbox environment
  webhookId: "webhook-id", // optional — for signature verification
});
```

| Option | Type | Required | Description |
|---|---|---|---|
| `clientId` | `string` | yes | PayPal application client ID |
| `clientSecret` | `string` | yes | PayPal application client secret |
| `sandbox` | `"true" \| ""` | no | Pass `"true"` to use sandbox environment |
| `webhookId` | `string` | no | PayPal webhook ID for signature verification |

## Authentication

Uses OAuth2 client credentials flow automatically. The provider:
1. Fetches an access token via `POST /v1/oauth2/token` with Basic auth
2. Caches the token until 60 seconds before expiry
3. Automatically refreshes on the next request after expiry

No manual token management required.

## API Mapping

| PaymentProvider method | PayPal API endpoint |
|---|---|
| `createIntent` | `POST /v2/checkout/orders` (intent: AUTHORIZE) |
| `confirmIntent` | `POST /v2/checkout/orders/{id}/capture` |
| `cancelIntent` | `GET /v2/checkout/orders/{id}` → returns cancelled |
| `createRefund` | GET order for captureId → `POST /v2/payments/captures/{captureId}/refund` |

## Status Mapping

| PayPal status | Provider status |
|---|---|
| `COMPLETED` | `succeeded` |
| `VOIDED` | `cancelled` |
| `APPROVED` | `processing` |
| `CREATED`, `SAVED`, `PAYER_ACTION_REQUIRED` | `pending` |

## Webhook

The `paypal()` module registers a webhook endpoint at `POST /paypal/webhook`. PayPal uses the `event_type` field in its webhook payloads.

```ts
// Response: { received: true, type: "PAYMENT.CAPTURE.COMPLETED" }
```

## Usage with payments module

```ts
import { PayPalPaymentProvider } from "@86d-app/paypal";
import payments from "@86d-app/payments";
import paypal from "@86d-app/paypal";
import { createStore } from "@86d-app/core";

const provider = new PayPalPaymentProvider(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET,
  process.env.NODE_ENV !== "production", // sandbox in non-prod
);

const store = createStore({
  modules: [
    payments({ currency: "USD", provider }),
    paypal({
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      sandbox: process.env.NODE_ENV !== "production" ? "true" : "",
    }),
  ],
});
```

## Notes

- `createIntent` creates a PayPal order with `intent: AUTHORIZE` (not immediately captured)
- `confirmIntent` captures the previously authorized order
- `cancelIntent` does not call a cancel API — PayPal orders that haven't been approved expire naturally. The method returns a `cancelled` status immediately.
- `createRefund` requires two API calls: first fetches the order to find the capture ID, then issues the refund against that capture

## Types

```ts
import type { PayPalOptions } from "@86d-app/paypal";
import { PayPalPaymentProvider } from "@86d-app/paypal";
```
