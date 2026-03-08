# Fulfillment Module — Store Components

Components exported for use in store MDX templates.

## FulfillmentSummary

Displays all fulfillments for an order with status, item count, carrier, and tracking details.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | `string` | Yes | Order ID to look up fulfillments for |

### Usage in MDX

```mdx
<FulfillmentSummary orderId="order_abc123" />
```

Use this component on an order detail or order confirmation page to show all fulfillment entries for a given order.

## FulfillmentTracker

Visual timeline showing fulfillment progress through each stage (pending, shipped, delivered), with timestamps and cancelled-state handling.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `FulfillmentStatus` | Yes | Current fulfillment status |
| `createdAt` | `string \| Date` | Yes | When the fulfillment was created |
| `shippedAt` | `string \| Date \| null` | No | When it was shipped, if applicable |
| `deliveredAt` | `string \| Date \| null` | No | When it was delivered, if applicable |

### Usage in MDX

```mdx
<FulfillmentTracker status="shipped" createdAt="2026-03-01T12:00:00Z" shippedAt="2026-03-03T09:30:00Z" />
```

Use this component on an order tracking page to visualize the fulfillment pipeline as a step-by-step timeline.

## TrackingInfo

Compact tracking card showing carrier name, tracking number with link, and current fulfillment status badge.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `FulfillmentStatus` | Yes | Current fulfillment status |
| `carrier` | `string \| null` | No | Carrier name (e.g. UPS, FedEx) |
| `trackingNumber` | `string \| null` | No | Tracking number |
| `trackingUrl` | `string \| null` | No | Full tracking URL |

### Usage in MDX

```mdx
<TrackingInfo status="shipped" carrier="UPS" trackingNumber="1Z999AA10123456784" trackingUrl="https://ups.com/track?num=1Z999AA10123456784" />
```

Use this component alongside order details to display shipping carrier and tracking information.
