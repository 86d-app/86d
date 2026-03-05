# Tax Module — Store Components

## TaxEstimate

Displays applicable tax rates for a given address. Useful on product pages or cart summary.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `country` | `string` | Country code |
| `state` | `string` | State/region |
| `city` | `string` | Optional city |
| `postalCode` | `string` | Optional postal code |

### Usage in MDX

```mdx
<TaxEstimate country="US" state="CA" />
```

## TaxBreakdown

Displays a detailed tax breakdown for a completed calculation. Used in checkout summary and order receipts.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `calculation` | `TaxCalculation` | Tax calculation result with totalTax, shippingTax, effectiveRate, inclusive |

### Usage in MDX

```mdx
<TaxBreakdown calculation={taxCalculation} />
```
