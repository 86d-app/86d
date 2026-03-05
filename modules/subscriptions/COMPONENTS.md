# Subscriptions Module — Store Components

Components exported for use in store MDX templates. Import via the component registry (auto-registered when the module is in `templates/brisa/config.json`).

## SubscriptionPlans

Displays a grid of available subscription plans with subscribe functionality. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `email` | `string` | — | Pre-fill subscriber email |
| `customerId` | `string` | — | Customer ID for authenticated subscriptions |
| `title` | `string` | — | Section heading |
| `onSubscribed` | `(subscription) => void` | — | Callback after successful subscription |

### Usage in MDX

```mdx
<SubscriptionPlans />

<SubscriptionPlans email={customerEmail} title="Choose a Plan" />
```

## MySubscriptions

Lists a customer's active subscriptions with cancellation options. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `email` | `string` | — | Customer email (required) |
| `title` | `string` | — | Section heading |

### Usage in MDX

```mdx
<MySubscriptions email={customerEmail} />

<MySubscriptions email={customerEmail} title="Your Subscriptions" />
```

Typically placed on a customer account page.

## PlanCard

Individual subscription plan card. Used internally by SubscriptionPlans.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `plan` | `SubscriptionPlan` | Plan object with id, name, description, price, currency, interval, intervalCount, trialDays, isActive |
| `onSubscribe` | `(planId: string) => void` | Callback when subscribe button is clicked |
| `subscribing` | `boolean` | Loading state for the subscribe action |

### Usage in MDX

```mdx
<PlanCard plan={plan} onSubscribe={handleSubscribe} subscribing={false} />
```

## SubscriptionCard

Individual active subscription card with status and cancel options. Used internally by MySubscriptions.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `subscription` | `Subscription` | Subscription object with id, planId, email, status, currentPeriodStart/End, cancelAtPeriodEnd, createdAt |
| `cancelling` | `boolean` | Loading state for the cancel action |
| `onCancel` | `(atPeriodEnd: boolean) => void` | Callback to cancel. `true` = cancel at period end, `false` = cancel immediately |

### Usage in MDX

```mdx
<SubscriptionCard subscription={sub} cancelling={false} onCancel={handleCancel} />
```
