# Memberships Module

Paid membership plans with exclusive benefits, gated products, and member pricing. Customers subscribe to plans that grant access to restricted products and perks like discounts and free shipping.

## File structure

```
src/
  index.ts              Factory, types, admin nav, events
  schema.ts             4 data models (membershipPlan, membership, membershipBenefit, membershipProduct)
  service.ts            MembershipController interface + all types
  service-impl.ts       Full controller implementation
  store/endpoints/      6 public endpoints (list plans, get plan, subscribe, cancel, check access, my membership)
  admin/endpoints/      14 admin endpoints (CRUD plans, manage memberships, benefits, product gating, stats)
  __tests__/            63 tests covering all controller methods
```

## Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `defaultTrialDays` | string | `"0"` | Default trial period for new plans |
| `defaultMaxMembers` | string | — | Max members per plan (unlimited if unset) |

## Data models

- **membershipPlan** — id, name, slug (unique), description?, price, billingInterval (monthly/yearly/lifetime), trialDays, features? (string[]), isActive, maxMembers?, sortOrder
- **membership** — id, customerId (indexed), planId (indexed), status (active/trial/expired/cancelled/paused), startDate, endDate?, trialEndDate?, cancelledAt?, pausedAt?
- **membershipBenefit** — id, planId (indexed), type (discount_percentage/free_shipping/early_access/exclusive_products/priority_support), value, description?, isActive
- **membershipProduct** — id, planId (indexed), productId (indexed), assignedAt

## Key behaviors

- **One active membership per customer** — subscribing to a new plan auto-cancels the previous one
- **Trial support** — plans with `trialDays > 0` create memberships with `status: "trial"` and `trialEndDate`
- **Lifetime plans** — no `endDate` set; monthly/yearly get calculated end dates
- **Max members** — enforced on subscribe; counts active + trial members
- **Product gating** — products can be gated to specific plans; `canAccessProduct` returns true for ungated products, checks membership for gated ones
- **Benefits** — typed perks (discount_percentage, free_shipping, etc.) attached to plans; `getCustomerBenefits` only returns active benefits for active/trial members
- **Cascade delete** — deleting a plan removes its benefits, gated products, and memberships

## Events

Emits: `membership.subscribed`, `membership.cancelled`, `membership.paused`, `membership.resumed`, `membership.expired`, `membership.plan.created/updated/deleted`, `membership.benefit.added/removed`, `membership.product.gated/ungated`

Requires: `customers`

## Gotchas

- `gateProduct` is idempotent — re-gating the same product returns the existing record
- `pauseMembership` only works on active/trial memberships; `resumeMembership` only works on paused ones
- `cancelMembership` on already-cancelled returns the membership unchanged (no error)
- Store endpoints only return active plans; admin endpoints show all
