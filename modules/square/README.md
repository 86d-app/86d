# @86d-app/square

Square payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`. Uses Square's Payments API via raw `fetch()` — no Square SDK required.

## Installation

```ts
import { SquarePaymentProvider } from "@86d-app/square";
import payments from "@86d-app/payments";

const provider = new SquarePaymentProvider("your-access-token");
const paymentsModule = payments({ currency: "USD", provider });
```

## Options

```ts
import square from "@86d-app/square";

const squareModule = square({
  accessToken: "your-access-token",
  webhookSignatureKey: "optional-signature-key",
});
```

| Option | Type | Required | Description |
|---|---|---|---|
| `accessToken` | `string` | yes | Square access token (production or sandbox) |
| `webhookSignatureKey` | `string` | no | Signature key for webhook verification |

## API Mapping

| PaymentProvider method | Square API endpoint |
|---|---|
| `createIntent` | `POST /v2/payments` (autocomplete: false) |
| `confirmIntent` | `POST /v2/payments/{id}/complete` |
| `cancelIntent` | `POST /v2/payments/{id}/cancel` |
| `createRefund` | `POST /v2/refunds` |

## Status Mapping

| Square status | Provider status |
|---|---|
| `COMPLETED` | `succeeded` |
| `CANCELED` | `cancelled` |
| `FAILED` | `failed` |
| `APPROVED`, `PENDING` | `pending` |

## Webhook

The `square()` module registers a webhook endpoint at `POST /square/webhook`. Square uses the `type` field in its webhook payloads.

```ts
// Response: { received: true, type: "payment.updated" }
```

Signature verification must be implemented at the adapter level using the `webhookSignatureKey`.

## Usage with payments module

```ts
import { SquarePaymentProvider } from "@86d-app/square";
import payments from "@86d-app/payments";
import square from "@86d-app/square";
import { createStore } from "@86d-app/core";

const provider = new SquarePaymentProvider(process.env.SQUARE_ACCESS_TOKEN);

const store = createStore({
  modules: [
    payments({ currency: "USD", provider }),
    square({ accessToken: process.env.SQUARE_ACCESS_TOKEN }),
  ],
});
```

## Notes

- Uses Square API version `2024-01-18`
- `createIntent` uses `source_id: "EXTERNAL"` and `autocomplete: false` — the payment is authorized but not completed until `confirmIntent` is called
- `createIntent` includes an `idempotency_key` generated via `crypto.randomUUID()` to prevent duplicate charges
- Amounts are in cents in the `PaymentProvider` interface; Square uses cents as well (`amount_money.amount`)
- Content-Type is `application/json` (unlike Stripe which uses form-encoded)

## Types

```ts
import type { SquareOptions } from "@86d-app/square";
import { SquarePaymentProvider } from "@86d-app/square";
```
