# Discounts Module — Store Components

Components exported for use in store MDX templates. Import via the component registry (auto-registered when the module is in `templates/brisa/config.json`).

## DiscountCodeInput

Promo code input field with validation. Shows applied state when a valid code is entered.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `subtotal` | `number` | `0` | Cart subtotal in cents (for minimum amount validation) |
| `productIds` | `string[]` | — | Product IDs for product-specific discounts |
| `categoryIds` | `string[]` | — | Category IDs for category-specific discounts |
| `onApplied` | `(result) => void` | — | Callback when a valid code is applied |
| `onRemoved` | `() => void` | — | Callback when the applied code is removed |
| `compact` | `boolean` | `false` | Compact inline layout |

### Usage in MDX

```mdx
<DiscountCodeInput />

<DiscountCodeInput
  subtotal={cartSubtotal}
  compact={true}
  onApplied={(result) => console.log(result)}
/>
```
