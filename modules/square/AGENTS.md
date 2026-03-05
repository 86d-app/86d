# Square Module

Square payment provider implementing the `PaymentProvider` interface from `@86d-app/payments`.

## Usage

```ts
import { SquarePaymentProvider } from "@86d-app/square";
import payments from "@86d-app/payments";

const provider = new SquarePaymentProvider("your-access-token");
const paymentsModule = payments({ currency: "USD", provider });
```

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

`POST /square/webhook` — receives Square webhook events. Returns `{ received: true, type }`.

## Tests

Tests mock global `fetch` via `vi.stubGlobal`. No real Square API calls are made.
Run: `bun test` from this directory.
