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

# @86d-app/stripe

Stripe payment provider for the 86d commerce platform. Implements the `PaymentProvider` interface from `@86d-app/payments` using raw `fetch()` calls to the Stripe REST API (no SDK dependency). Includes a webhook endpoint with HMAC-SHA256 signature verification.

![version](https://img.shields.io/badge/version-0.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Installation

```sh
npm install @86d-app/stripe @86d-app/payments
```

## Usage

Register the module and pass the provider to the payments module:

```ts
import stripe, { StripePaymentProvider } from "@86d-app/stripe";
import payments from "@86d-app/payments";
import { createModuleClient } from "@86d-app/core";

const stripeProvider = new StripePaymentProvider("sk_live_...");

const client = createModuleClient([
  stripe({
    apiKey: "sk_live_...",
    webhookSecret: "whsec_...",
  }),
  payments({ provider: stripeProvider }),
]);
```

## Configuration

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `webhookSecret` | `string` | No | Webhook signing secret (`whsec_...`) for signature verification |

## Payment Provider

`StripePaymentProvider` implements the `PaymentProvider` interface:

```ts
const provider = new StripePaymentProvider("sk_live_...");

// Create a PaymentIntent (amount in cents)
const intent = await provider.createIntent({
  amount: 2500,        // $25.00
  currency: "usd",
});
// { providerIntentId: "pi_...", status: "pending", providerMetadata: { clientSecret: "..." } }

// Confirm after client-side payment
await provider.confirmIntent("pi_...");

// Cancel an uncaptured intent
await provider.cancelIntent("pi_...");

// Issue a full or partial refund
await provider.createRefund({
  providerIntentId: "pi_...",
  amount: 1000,        // $10.00 partial refund (omit for full)
  reason: "requested_by_customer",
});
```

### Status Mapping

| Stripe Status | Mapped Status |
|---|---|
| `succeeded` | `succeeded` |
| `canceled` | `cancelled` |
| `processing`, `requires_capture` | `processing` |
| `requires_payment_method`, `requires_confirmation`, `requires_action` | `pending` |

## Webhook Endpoint

| Method | Path | Description |
|---|---|---|
| `POST` | `/stripe/webhook` | Receive Stripe webhook events |

The webhook endpoint:

1. Reads the raw request body before parsing (required for HMAC verification)
2. Verifies the `Stripe-Signature` header using HMAC-SHA256 with timestamp replay protection (5-minute tolerance)
3. Returns `{ received: true, type: "..." }` on success

**Without `webhookSecret`:** All requests are accepted without verification (useful for local development).

**With `webhookSecret`:** Invalid or expired signatures return `401`.

### Webhook Verification

Signature verification uses the Web Crypto API (no external dependencies) and follows the Stripe signing scheme:

```
signed_payload = <timestamp> + "." + <raw_body>
expected_sig   = HMAC-SHA256(webhook_secret, signed_payload)
```

The `v1` signature from the `Stripe-Signature` header is compared using constant-time comparison to prevent timing attacks.

## Provider API Reference

```ts
interface PaymentProvider {
  createIntent(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<ProviderIntentResult>;

  confirmIntent(providerIntentId: string): Promise<ProviderIntentResult>;

  cancelIntent(providerIntentId: string): Promise<ProviderIntentResult>;

  createRefund(params: {
    providerIntentId: string;
    amount?: number;
    reason?: string;
  }): Promise<ProviderRefundResult>;
}
```

## Types

```ts
interface StripeOptions extends ModuleConfig {
  apiKey: string;
  webhookSecret?: string;
}

interface ProviderIntentResult {
  providerIntentId: string;
  status: "pending" | "processing" | "succeeded" | "cancelled" | "failed";
  providerMetadata?: Record<string, unknown>;
}

interface ProviderRefundResult {
  providerRefundId: string;
  status: "pending" | "succeeded" | "failed";
  providerMetadata?: Record<string, unknown>;
}
```
