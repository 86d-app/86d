# PayPal Module

PayPal payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`.

## Usage

```ts
import { PayPalPaymentProvider } from "@86d-app/paypal";
import payments from "@86d-app/payments";

const provider = new PayPalPaymentProvider("CLIENT_ID", "CLIENT_SECRET");
const paymentsModule = payments({ currency: "USD", provider });
```

## Authentication

Uses OAuth2 client credentials flow. The provider automatically fetches and caches access tokens, refreshing them before expiry (60-second buffer before the `expires_in` deadline).

## API Mapping

| PaymentProvider method | PayPal API endpoint |
|---|---|
| `createIntent` | `POST /v2/checkout/orders` (intent: AUTHORIZE) |
| `confirmIntent` | `POST /v2/checkout/orders/{id}/capture` |
| `cancelIntent` | `GET /v2/checkout/orders/{id}` then returns cancelled (PayPal orders expire if not captured) |
| `createRefund` | `GET /v2/checkout/orders/{id}` → `POST /v2/payments/captures/{captureId}/refund` |

## Status Mapping

| PayPal status | Provider status |
|---|---|
| `COMPLETED` | `succeeded` |
| `VOIDED` | `cancelled` |
| `APPROVED` | `processing` |
| `CREATED` | `pending` |

## Sandbox

Pass `true` as the third constructor argument to use `https://api-m.sandbox.paypal.com`:

```ts
const provider = new PayPalPaymentProvider("CLIENT_ID", "CLIENT_SECRET", true);
```

Or via module options:

```ts
import paypal from "@86d-app/paypal";

const paypalModule = paypal({
  clientId: "CLIENT_ID",
  clientSecret: "CLIENT_SECRET",
  sandbox: "true",
});
```

## Webhook

`POST /paypal/webhook` — receives PayPal webhook events. Returns `{ received: true, type }`.

PayPal uses `event_type` (not `type`) in their webhook payloads.
