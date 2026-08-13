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

# Checkout Module

📚 **Documentation:** [86d.app/docs/modules/checkout](https://86d.app/docs/modules/checkout)

Checkout session management for the 86d commerce platform. Handles the cart-to-order conversion flow: session creation, address collection, discount application, and order completion.

> [!IMPORTANT]
> Live confirmation, payment, and completion are intentionally unavailable while the accepted-offer finalizer is incomplete. Shopper mutations are revision guarded: read the session's `revision` and send it as the required `expectedRevision`; stale writes return `CHECKOUT_REVISION_CONFLICT` (HTTP 409).

![version](https://img.shields.io/badge/version-0.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Installation

```sh
npm install @86d-app/checkout
```

## Usage

```ts
import checkout from "@86d-app/checkout";
import { createModuleClient } from "@86d-app/core";

const client = createModuleClient([
  checkout({
    sessionTtl: 1800000, // 30 minutes
    currency: "USD",
  }),
]);
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `sessionTtl` | `number` | `1800000` | Session time-to-live in milliseconds |
| `currency` | `string` | `"USD"` | Default currency code for sessions |

## Session Statuses

| Status | Description |
|---|---|
| `pending` | Session created, awaiting completion |
| `processing` | Payment is being processed |
| `completed` | Order placed successfully |
| `expired` | Session TTL elapsed |
| `abandoned` | Customer left without completing |

Flow: `pending → processing → completed`, `pending → expired`, `pending/processing → abandoned`

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/checkout/sessions` | Create a new checkout session |
| `GET` | `/checkout/sessions/:id` | Get a session by ID |
| `PUT` | `/checkout/sessions/:id/update` | Update addresses, shipping amount, or payment method |
| `POST` | `/checkout/sessions/:id/discount` | Apply a discount code |

Every mutation after session creation requires `expectedRevision`. The Store
Runtime locks the Checkout-owned row, compares the revision, and increments it
atomically with the update. Row-locking unavailability fails closed rather than
falling back to last-write-wins behavior.

> Note: Checkout is customer-facing only. There are no admin endpoints.

## Controller API

```ts
// Create a new checkout session
controller.create(params: {
  id?: string;
  cartId?: string;
  customerId?: string;
  guestEmail?: string;
  currency?: string;
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  total: number;
  lineItems: CheckoutLineItem[];
  shippingAddress?: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  metadata?: Record<string, unknown>;
  ttl?: number; // per-session TTL override in ms
}): Promise<CheckoutSession>

// Get a session by ID
controller.getById(id: string): Promise<CheckoutSession | null>

// Update address info and recalculate total
controller.update(id: string, params: {
  guestEmail?: string;
  shippingAddress?: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  shippingAmount?: number;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
}): Promise<CheckoutSession | null>

// Apply a promo code (discount amounts pre-validated by discounts module)
controller.applyDiscount(id: string, params: {
  code: string;
  discountAmount: number;
  freeShipping: boolean;
}): Promise<CheckoutSession | null>

// Remove the applied discount and restore original total
controller.removeDiscount(id: string): Promise<CheckoutSession | null>

// Mark session as completed and store the resulting order ID
controller.complete(id: string, orderId: string): Promise<CheckoutSession | null>

// Abandon a pending or processing session
controller.abandon(id: string): Promise<CheckoutSession | null>

// Retrieve line items stored for a session
controller.getLineItems(sessionId: string): Promise<CheckoutLineItem[]>

// Expire all sessions past their TTL — call periodically (e.g. cron)
controller.expireStale(): Promise<number>
```

## Types

```ts
type CheckoutStatus = "pending" | "processing" | "completed" | "expired" | "abandoned";

interface CheckoutAddress {
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface CheckoutLineItem {
  productId: string;
  variantId?: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

interface CheckoutSession {
  id: string;
  revision: number;
  cartId?: string;
  customerId?: string;
  guestEmail?: string;
  status: CheckoutStatus;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  discountCode?: string;
  shippingAddress?: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  paymentMethod?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

```

## Inter-module Integration

Checkout accepts versioned contracts owned by Products, Orders, Inventory, Tax, Shipping, Discounts, Gift Cards, Store Credits, Payments, Price Lists, and Multi-currency. Product resolution and Order creation are required at admission; the remaining integrations are explicitly optional. Every call is schema-validated and the provider receives only its own data service.

```ts
const result = await ctx.context.capabilities.invoke(
  discountCodeCapability,
  { operation: "validate", code, subtotal },
);

if (!result.ok) {
  return {
    code: "CHECKOUT_DISCOUNT_UNAVAILABLE",
    error: "An authoritative discount decision is unavailable.",
    status: 503,
  };
}
```

The Checkout-owned controller remains local to Checkout request paths. Order creation crosses `orderCreateCapability`; on success Checkout links the returned Order ID to the session.

## Store Components

### CheckoutForm

Multi-step checkout orchestrator. Renders the active step (information → shipping → payment → review) alongside an order summary sidebar. Includes a step indicator showing progress.

#### Props

None. Reads session ID from `checkoutState`. If no session is set, shows a "Return to cart" fallback.

#### Usage in MDX

```mdx
<CheckoutForm />
```

Place on the checkout page (e.g. `templates/brisa/checkout.mdx`). Before rendering, set `checkoutState.sessionId` to a valid checkout session ID (typically created from the cart).

### CheckoutInformation

Step 1: Collects the customer's email address. Advances to the shipping step on submit.

#### Props

None.

#### Usage in MDX

```mdx
<CheckoutInformation />
```

Typically rendered automatically by `CheckoutForm`. Can be used standalone if building a custom checkout layout.

### CheckoutShipping

Step 2: Collects the shipping address (name, address, city, state, ZIP, country, phone). Advances to the payment step on submit.

#### Props

None.

#### Usage in MDX

```mdx
<CheckoutShipping />
```

### CheckoutPayment

Step 3: Confirms the checkout session (validates fields, reserves inventory) and creates a payment intent. In demo mode (no payments module), auto-succeeds. With a payment provider, renders a placeholder for the provider's UI (e.g. Stripe PaymentElement).

#### Props

None.

#### Usage in MDX

```mdx
<CheckoutPayment />
```

### CheckoutReview

Step 4: Shows the final order summary — contact, shipping address, line items, and totals. The "Place order" button completes the checkout session and shows an order confirmation.

#### Props

None.

#### Usage in MDX

```mdx
<CheckoutReview />
```

### CheckoutSummary

Order summary sidebar. Displays line items, subtotal, shipping, tax, discount, gift card, and total. Includes forms for applying/removing promo codes and gift cards.

#### Props

None.

#### Usage in MDX

```mdx
<CheckoutSummary />
```

Rendered automatically by `CheckoutForm` in the sidebar. Can also be used standalone in a custom layout.
