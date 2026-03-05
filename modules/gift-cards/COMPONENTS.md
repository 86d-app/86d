# Gift Cards Module — Store Components

## GiftCardBalance

Balance checker — customer enters code to check balance.

### Props

None. Fetches and displays balance based on user input.

### Usage in MDX

```mdx
<GiftCardBalance />
```

## GiftCardRedeem

Redeem form — apply gift card to an order at checkout.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | `string` | Optional order ID |
| `orderTotal` | `number` | Order total in cents |
| `onApplied` | `(amountApplied, remainingBalance) => void` | Callback when applied |

### Usage in MDX

```mdx
<GiftCardRedeem orderTotal={cartTotal} onApplied={handleApplied} />
```
