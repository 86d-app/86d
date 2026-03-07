# Loyalty Module — Store Components

## PointsBalance

Displays the customer's current loyalty points balance with tier badge and lifetime stats.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | No | Customer ID. Shows sign-in prompt if omitted. |

### Usage

```mdx
<PointsBalance customerId={session.customerId} />
```

### States

- **Signed out**: Prompts the user to sign in.
- **Loading**: Animated skeleton placeholder.
- **Loaded**: Balance number, tier badge (bronze/silver/gold/platinum), lifetime earned/redeemed stats.

---

## TierProgress

Shows the customer's current tier and a visual progress bar toward the next tier.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | No | Customer ID. Shows sign-in prompt if omitted. |

### Usage

```mdx
<TierProgress customerId={session.customerId} />
```

### States

- **Signed out**: Prompts the user to sign in.
- **Loading**: Animated skeleton placeholder.
- **Loaded**: Progress bar, percentage to next tier, tier step indicators with checkmarks for passed tiers. Displays multiplier badge if the current tier has a points multiplier > 1x.

---

## PointsHistory

Filterable table of the customer's loyalty point transactions (earn, redeem, adjust, expire).

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | No | Customer ID. Shows sign-in prompt if omitted. |
| `limit` | `number` | No | Maximum transactions to show (default: 10). |

### Usage

```mdx
<PointsHistory customerId={session.customerId} limit={20} />
```

### States

- **Signed out**: Prompts the user to sign in.
- **Loading**: Animated skeleton rows.
- **Loaded**: Filter bar (all/earn/redeem/adjust/expire) + transaction table with type badge, description, signed point amount, and date.
- **Empty**: "No transactions found" message.

---

## LoyaltyPage

Full-page loyalty dashboard composing PointsBalance, TierProgress, and PointsHistory into a single view.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | No | Customer ID. Shows sign-in prompt if omitted. |

### Usage

```mdx
<LoyaltyPage customerId={session.customerId} />
```

### Layout

- Header with "My Rewards" title
- Two-column grid: PointsBalance + TierProgress
- Full-width PointsHistory below
