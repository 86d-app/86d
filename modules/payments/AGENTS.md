# payments module

Provider-agnostic payment processing module. Tracks payment intents, saved payment methods, and refunds locally. Delegates actual payment processing to a configurable `PaymentProvider` (e.g. Stripe).

## Architecture

- `schema.ts` — `paymentIntent`, `paymentMethod`, `refund` entities
- `service.ts` — `PaymentController`, `PaymentProvider`, `PaymentIntent`, `PaymentMethod`, `Refund` types
- `service-impl.ts` — `createPaymentController(data, provider?)` factory
- `endpoints/store/` — customer-facing endpoints (create/confirm/cancel intent, manage payment methods)
- `endpoints/admin/` — admin endpoints (list, get, refund)

## PaymentProvider Interface

Users plug in a provider by implementing `PaymentProvider`:
- `createIntent(params)` — returns `{ providerIntentId, status, providerMetadata? }`
- `confirmIntent(providerIntentId)` — returns updated status
- `cancelIntent(providerIntentId)` — returns cancelled status
- `createRefund(params)` — returns `{ providerRefundId, status, providerMetadata? }`

The module works without a provider (offline mode) — intents are stored with `pending` status and transitions are handled locally.

## Store Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/payments/intents` | Create payment intent |
| GET | `/payments/intents/:id` | Get intent by ID |
| POST | `/payments/intents/:id/confirm` | Confirm payment |
| POST | `/payments/intents/:id/cancel` | Cancel payment |
| GET | `/payments/methods` | List customer's payment methods |
| DELETE | `/payments/methods/:id` | Delete a payment method |

## Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/payments` | List all intents (filter: customerId, status, orderId) |
| GET | `/admin/payments/:id` | Get intent detail |
| POST | `/admin/payments/:id/refund` | Create refund |
| GET | `/admin/payments/:id/refunds` | List refunds for intent |

## Tests (34 tests)

Run: `bun test` from this directory.

Covers: createIntent, getIntent, confirmIntent, cancelIntent, listIntents, savePaymentMethod, getPaymentMethod, listPaymentMethods, deletePaymentMethod, createRefund, getRefund, listRefunds — all with and without provider.
