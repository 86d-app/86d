# Shipping Module — Store Components

Components exported for use in store MDX templates.

## ShippingEstimator

Shipping cost estimator form. Customers select a country and optionally enter an order total to see available shipping rates and prices.

### Props

None. The component manages its own state and fetches rates via the module client.

### Usage in MDX

```mdx
<ShippingEstimator />
```

Suitable for product pages, cart pages, or a dedicated shipping info page.

## ShippingOptions

Displays available shipping rates as selectable radio buttons. Auto-fetches rates based on provided country and order amount. Selects the cheapest option by default.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `country` | `string` | Yes | ISO 3166-1 alpha-2 country code |
| `orderAmount` | `number` | Yes | Cart total in cents |
| `weight` | `number` | No | Total weight in grams |
| `onSelect` | `(rate) => void` | No | Callback when a rate is selected |
| `selectedRateId` | `string` | No | Pre-selected rate ID |

### Usage in MDX

```mdx
<ShippingOptions country="US" orderAmount={5000} onSelect={handleSelect} />
```

Designed for checkout flows where the customer picks a shipping method.

## ShippingRateSummary

Displays a selected shipping method and its cost. Shows a truck icon, rate name, optional zone name, and price. Free shipping is highlighted in green.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `rateName` | `string` | Yes | Name of the selected rate |
| `zoneName` | `string` | No | Name of the shipping zone |
| `price` | `number` | Yes | Price in cents (0 = free) |

### Usage in MDX

```mdx
<ShippingRateSummary rateName="Standard Shipping" price={599} />
<ShippingRateSummary rateName="Free Shipping" zoneName="Domestic" price={0} />
```

Use in order summaries, confirmation pages, or checkout review steps.
