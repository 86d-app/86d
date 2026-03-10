# @86d-app/bulk-pricing

Quantity-based tiered pricing module for 86d. Define pricing rules that give customers volume discounts — buy more, pay less per unit. Supports percentage, fixed-amount, and fixed-price discount types across product, variant, collection, and global scopes.

## Installation

```ts
import bulkPricing from "@86d-app/bulk-pricing";

const module = bulkPricing({
  defaultPriority: 0,
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultPriority` | `number` | `0` | Default priority for new pricing rules |

## Store endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/bulk-pricing/resolve` | Resolve the bulk price for a product at a given quantity |
| GET | `/bulk-pricing/product/:productId/tiers` | Get tier previews for a product |

## Admin endpoints

### Rules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/bulk-pricing/rules` | List rules (filter by scope, targetId, active) |
| POST | `/admin/bulk-pricing/rules/create` | Create a pricing rule |
| GET | `/admin/bulk-pricing/rules/:id` | Get rule detail |
| POST | `/admin/bulk-pricing/rules/:id/update` | Update a rule |
| POST | `/admin/bulk-pricing/rules/:id/delete` | Delete a rule |
| GET | `/admin/bulk-pricing/rules/:id/preview` | Preview tier pricing at a base price |

### Tiers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/bulk-pricing/tiers` | List tiers (requires ruleId) |
| POST | `/admin/bulk-pricing/tiers/create` | Create a pricing tier |
| GET | `/admin/bulk-pricing/tiers/:id` | Get tier detail |
| POST | `/admin/bulk-pricing/tiers/:id/update` | Update a tier |
| POST | `/admin/bulk-pricing/tiers/:id/delete` | Delete a tier |

### Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/bulk-pricing/summary` | Bulk pricing analytics summary |

## Controller API

```ts
interface BulkPricingController {
  // Rules
  createRule(params): Promise<PricingRule>
  updateRule(id, params): Promise<PricingRule | null>
  getRule(id): Promise<PricingRule | null>
  listRules(params?): Promise<PricingRule[]>
  deleteRule(id): Promise<boolean>

  // Tiers
  createTier(params): Promise<PricingTier>
  updateTier(id, params): Promise<PricingTier | null>
  getTier(id): Promise<PricingTier | null>
  listTiers(params): Promise<PricingTier[]>
  deleteTier(id): Promise<boolean>

  // Price resolution
  resolvePrice(params): Promise<ResolvedBulkPrice>
  previewTiers(ruleId, basePrice): Promise<TierPreview[]>

  // Analytics
  getSummary(): Promise<BulkPricingSummary>
}
```

## Discount types

- **percentage** — Reduce unit price by N% (e.g., 15% off when buying 10+)
- **fixed_amount** — Subtract a fixed amount from unit price (e.g., $3 off per unit)
- **fixed_price** — Set a fixed unit price regardless of base (e.g., $6.99 each for 50+)

## Rule scopes

- **product** — Applies to a specific product ID
- **variant** — Applies to a specific variant ID
- **collection** — Applies to all products in a collection
- **global** — Applies to all products

## Types

Key types exported from the module:

- `PricingRule` — A pricing rule with scope, priority, and optional date range
- `PricingTier` — A quantity break with discount type and value
- `PricingScope` — `"product" | "variant" | "collection" | "global"`
- `DiscountType` — `"percentage" | "fixed_amount" | "fixed_price"`
- `ResolvedBulkPrice` — Result of price resolution with matched tier/rule
- `TierPreview` — Tier with computed unit price and savings percentage
- `BulkPricingSummary` — Aggregate analytics
- `BulkPricingController` — Controller interface

## Notes

- When multiple rules match, the highest-priority rule wins
- Within a rule, the highest-minQuantity qualifying tier is selected
- Unit price never goes below zero
- Rules can be scheduled with `startsAt`/`endsAt` date range
- The `previewTiers` endpoint computes unit prices and savings percentages at a given base price
- The module requires the `products` module
