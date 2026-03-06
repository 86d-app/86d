<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://vercel.com/changelog"><strong>npm</strong></a> ·
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://vercel.com/templates"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# @86d-app/payments

Provider-agnostic payment processing for the 86d commerce platform. Tracks payment intents, saved payment methods, and refunds locally. Delegates actual processing to a configurable `PaymentProvider` (Stripe, Square, PayPal, etc.).

![version](https://img.shields.io/badge/version-0.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Installation

```sh
npm install @86d-app/payments
```

## Usage

```ts
import payments from "@86d-app/payments";
import { createModuleClient } from "@86d-app/core";

// Without a provider (offline/test mode)
const client = createModuleClient([payments()]);

// With a Stripe provider
import { StripePaymentProvider } from "@86d-app/stripe";
const provider = new StripePaymentProvider("sk_live_...");
const client = createModuleClient([payments({ provider, currency: "USD" })]);
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `currency` | `string` | `"USD"` | Default currency for payment intents |
| `provider` | `PaymentProvider` | `undefined` | Payment processor implementation |

## PaymentProvider Interface

Implement this interface to connect any payment processor:

```ts
interface PaymentProvider {
  createIntent(params: {
    amount: number;      // in smallest currency unit (e.g. cents)
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProviderIntentResult>;

  confirmIntent(providerIntentId: string): Promise<ProviderIntentResult>;

  cancelIntent(providerIntentId: string): Promise<ProviderIntentResult>;

  createRefund(params: {
    providerIntentId: string;
    amount?: number;    // partial refund; omit for full refund
    reason?: string;
  }): Promise<ProviderRefundResult>;
}
```

**Offline mode:** If no provider is configured, intents are stored locally with `pending` status and status transitions are handled in-memory. Useful for testing and development.

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/payments/intents` | Create a payment intent |
| `GET` | `/payments/intents/:id` | Get intent by ID |
| `POST` | `/payments/intents/:id/confirm` | Confirm payment |
| `POST` | `/payments/intents/:id/cancel` | Cancel payment |
| `GET` | `/payments/methods` | List customer's saved payment methods |
| `DELETE` | `/payments/methods/:id` | Delete a payment method |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/payments` | List all intents (filter: `customerId`, `status`, `orderId`) |
| `GET` | `/admin/payments/:id` | Get intent detail |
| `POST` | `/admin/payments/:id/refund` | Issue a refund |
| `GET` | `/admin/payments/:id/refunds` | List refunds for an intent |

## Controller API

```ts
// ── Payment intents ─────────────────────────────────────────────────────────

controller.createIntent(params: {
  amount: number;             // in smallest currency unit (e.g. cents)
  currency?: string;          // default: module currency option
  customerId?: string;
  email?: string;
  orderId?: string;
  checkoutSessionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaymentIntent>

controller.getIntent(id: string): Promise<PaymentIntent | null>

controller.confirmIntent(id: string): Promise<PaymentIntent | null>

controller.cancelIntent(id: string): Promise<PaymentIntent | null>

controller.listIntents(params?: {
  customerId?: string;
  status?: PaymentIntentStatus;
  orderId?: string;
  take?: number;
  skip?: number;
}): Promise<PaymentIntent[]>

// ── Payment methods ─────────────────────────────────────────────────────────

// Saves a payment method; if isDefault=true, clears all other defaults
controller.savePaymentMethod(params: {
  customerId: string;
  providerMethodId: string;  // e.g. Stripe's pm_xxx
  type?: string;             // "card" | "bank_transfer" | "wallet"
  last4?: string;
  brand?: string;            // "visa" | "mastercard" | etc.
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}): Promise<PaymentMethod>

controller.getPaymentMethod(id: string): Promise<PaymentMethod | null>

controller.listPaymentMethods(customerId: string): Promise<PaymentMethod[]>

controller.deletePaymentMethod(id: string): Promise<boolean>

// ── Refunds ─────────────────────────────────────────────────────────────────

// Throws if payment intent not found; marks intent status as "refunded"
controller.createRefund(params: {
  intentId: string;
  amount?: number;   // omit for full refund
  reason?: string;
}): Promise<Refund>

controller.getRefund(id: string): Promise<Refund | null>

controller.listRefunds(intentId: string): Promise<Refund[]>
```

## Example: Checkout Payment Flow

```ts
// 1. Customer initiates checkout — create intent
const intent = await controller.createIntent({
  amount: 4999,   // $49.99
  currency: "USD",
  customerId: "cust_123",
  orderId: "ord_456",
});
// intent.status === "pending"
// With Stripe: intent.providerMetadata.clientSecret → send to frontend

// 2. Customer completes payment on frontend → call confirm
const confirmed = await controller.confirmIntent(intent.id);
// confirmed.status === "succeeded"

// 3. Customer requests refund
const refund = await controller.createRefund({
  intentId: intent.id,
  reason: "customer request",
});
// refund.status === "succeeded"
// intent.status is now "refunded"

// 4. Save a payment method for future use
const method = await controller.savePaymentMethod({
  customerId: "cust_123",
  providerMethodId: "pm_stripe_xxx",
  type: "card",
  last4: "4242",
  brand: "visa",
  isDefault: true,
});
```

## Payment Intent Statuses

| Status | Description |
|---|---|
| `pending` | Intent created, payment not yet initiated |
| `processing` | Payment is being processed |
| `succeeded` | Payment completed successfully |
| `failed` | Payment failed |
| `cancelled` | Intent was cancelled |
| `refunded` | Payment has been refunded |

## Types

```ts
type PaymentIntentStatus =
  | "pending" | "processing" | "succeeded"
  | "failed" | "cancelled" | "refunded";

type RefundStatus = "pending" | "succeeded" | "failed";

interface PaymentIntent {
  id: string;
  providerIntentId?: string;   // e.g. Stripe's pi_xxx
  customerId?: string;
  email?: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  paymentMethodId?: string;
  orderId?: string;
  checkoutSessionId?: string;
  metadata: Record<string, unknown>;
  providerMetadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentMethod {
  id: string;
  customerId: string;
  providerMethodId: string;
  type: string;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Refund {
  id: string;
  paymentIntentId: string;
  providerRefundId: string;
  amount: number;
  reason?: string;
  status: RefundStatus;
  createdAt: Date;
  updatedAt: Date;
}
```
