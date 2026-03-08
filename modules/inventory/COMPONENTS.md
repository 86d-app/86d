# Inventory Module — Store Components

Components exported for use in store MDX templates.

## BackInStockForm

Standalone email subscription form that lets customers sign up to be notified when an out-of-stock product becomes available again.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | ID of the product to subscribe for |
| `variantId` | `string` | No | Optional variant ID for variant-level tracking |
| `productName` | `string` | No | Display name shown in confirmation text (defaults to "this product") |

### Usage in MDX

```mdx
<BackInStockForm productId="prod_123" productName="Widget Pro" />
```

Use this component on product detail pages or out-of-stock product listings to capture restock interest.

## StockAvailability

Displays detailed stock status for a product including quantity available, low-stock warnings, and backorder availability.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | ID of the product to check stock for |
| `variantId` | `string` | No | Optional variant ID for variant-level stock checks |
| `showQuantity` | `boolean` | No | Whether to display the available quantity number (defaults to `false`) |

### Usage in MDX

```mdx
<StockAvailability productId="prod_123" showQuantity />
```

Use this component on product detail pages to show a detailed availability indicator with optional quantity display.

## StockStatus

Displays a minimal stock status indicator (in stock, low stock, out of stock, or backorder) for a product.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | ID of the product to check stock for |
| `variantId` | `string` | No | Optional variant ID for variant-level stock checks |

### Usage in MDX

```mdx
<StockStatus productId="prod_123" />
```

Use this component on product cards or listing pages where a compact stock indicator is needed.
