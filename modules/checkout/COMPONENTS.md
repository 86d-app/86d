# Checkout Module — Store Components

Components exported for use in store MDX templates.

## CheckoutForm

Multi-step checkout orchestrator. Renders the active step (information → shipping → payment → review) alongside an order summary sidebar. Includes a step indicator showing progress.

### Props

None. Reads session ID from `checkoutState`. If no session is set, shows a "Return to cart" fallback.

### Usage in MDX

```mdx
<CheckoutForm />
```

Place on the checkout page (e.g. `templates/brisa/checkout.mdx`). Before rendering, set `checkoutState.sessionId` to a valid checkout session ID (typically created from the cart).

## CheckoutInformation

Step 1: Collects the customer's email address. Advances to the shipping step on submit.

### Props

None.

### Usage in MDX

```mdx
<CheckoutInformation />
```

Typically rendered automatically by `CheckoutForm`. Can be used standalone if building a custom checkout layout.

## CheckoutShipping

Step 2: Collects the shipping address (name, address, city, state, ZIP, country, phone). Advances to the payment step on submit.

### Props

None.

### Usage in MDX

```mdx
<CheckoutShipping />
```

## CheckoutPayment

Step 3: Confirms the checkout session (validates fields, reserves inventory) and creates a payment intent. In demo mode (no payments module), auto-succeeds. With a payment provider, renders a placeholder for the provider's UI (e.g. Stripe PaymentElement).

### Props

None.

### Usage in MDX

```mdx
<CheckoutPayment />
```

## CheckoutReview

Step 4: Shows the final order summary — contact, shipping address, line items, and totals. The "Place order" button completes the checkout session and shows an order confirmation.

### Props

None.

### Usage in MDX

```mdx
<CheckoutReview />
```

## CheckoutSummary

Order summary sidebar. Displays line items, subtotal, shipping, tax, discount, gift card, and total. Includes forms for applying/removing promo codes and gift cards.

### Props

None.

### Usage in MDX

```mdx
<CheckoutSummary />
```

Rendered automatically by `CheckoutForm` in the sidebar. Can also be used standalone in a custom layout.
