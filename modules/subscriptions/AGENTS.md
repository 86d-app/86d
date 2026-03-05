# Subscriptions Module

Subscription plan and subscriber management. Handles recurring billing cycles, trial periods, and subscription lifecycle — status tracking only. Payment processing is delegated to P3 payment modules.

## Structure

```
src/
  index.ts          Factory: subscriptions(options?) => Module
  schema.ts         Models: subscriptionPlan, subscription
  service.ts        SubscriptionController interface + types
  service-impl.ts   SubscriptionController implementation
  endpoints/
    store/          Customer-facing
      subscribe.ts              POST /subscriptions/subscribe
      get-my-subscriptions.ts   GET  /subscriptions/me?email=
      cancel.ts                 POST /subscriptions/me/cancel
    admin/          Protected (store admin only)
      list-subscriptions.ts     GET    /admin/subscriptions
      get-subscription.ts       GET    /admin/subscriptions/:id
      list-plans.ts             GET    /admin/subscriptions/plans
      create-plan.ts            POST   /admin/subscriptions/plans/create
      update-plan.ts            PUT    /admin/subscriptions/plans/:id/update
      delete-plan.ts            DELETE /admin/subscriptions/plans/:id/delete
  __tests__/
    service-impl.test.ts    44 tests
```

## Data models

- **subscriptionPlan**: id, name, description?, price (cents), currency, interval, intervalCount, trialDays?, isActive, createdAt, updatedAt
- **subscription**: id, planId, customerId?, email, status, currentPeriodStart, currentPeriodEnd, trialStart?, trialEnd?, cancelledAt?, cancelAtPeriodEnd, createdAt, updatedAt

## Subscription lifecycle

```
(subscribe) → active
              └─ if trialDays > 0 → trialing
(expireSubscriptions) → expired   (currentPeriodEnd < now)
(cancelSubscription)  → cancelled (immediate) or cancelAtPeriodEnd=true flag
(renewSubscription)   → active    (advance period dates)
```

## Intervals

`calculateNextPeriod(interval, intervalCount, from?)` computes the next billing period:
- `day` → add N days
- `week` → add N×7 days
- `month` → add N months
- `year` → add N years
- Used in both `subscribe` (from now) and `renewSubscription` (from currentPeriodEnd)

## Exports (for inter-module contracts)

Types exported: `Subscription`, `SubscriptionPlan`, `SubscriptionController`, `SubscriptionInterval`, `SubscriptionStatus`

## Patterns

- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`
- `updatePlan` uses explicit conditional field assignment (NOT `Object.fromEntries`) to satisfy exactOptionalPropertyTypes
- `findMany` uses spread pattern for optional take/skip
- `expireSubscriptions` scans up to 10,000 records — callers should invoke periodically (cron)
- No payment processing — this module is payment-provider agnostic
