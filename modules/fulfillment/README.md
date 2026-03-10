<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# Fulfillment Module

Manages the order fulfillment lifecycle from packing through shipment tracking to delivery confirmation. Supports multiple fulfillments per order for partial shipments.

## Installation

```sh
npm install @86d-app/fulfillment
```

## Usage

```ts
import fulfillment from "@86d-app/fulfillment";

const module = fulfillment({
  autoShipOnTracking: true,
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `autoShipOnTracking` | `boolean` | `false` | Automatically transition status to "shipped" when tracking info is added |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/fulfillment/:id` | Get a single fulfillment by ID |
| `GET` | `/fulfillment/order/:orderId` | List all fulfillments for an order |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/fulfillment` | List all fulfillments (filterable by status) |
| `POST` | `/admin/fulfillment/create` | Create a new fulfillment for an order |
| `GET` | `/admin/fulfillment/:id` | Get a fulfillment by ID |
| `PUT` | `/admin/fulfillment/:id/status` | Update fulfillment status |
| `PUT` | `/admin/fulfillment/:id/tracking` | Add carrier and tracking information |
| `POST` | `/admin/fulfillment/:id/cancel` | Cancel a fulfillment |
| `GET` | `/admin/fulfillment/order/:orderId` | List fulfillments for an order (admin) |

## Controller API

The `FulfillmentController` interface is exported for inter-module use.

```ts
interface FulfillmentController {
  createFulfillment(params: {
    orderId: string;
    items: FulfillmentItem[];
    notes?: string;
  }): Promise<Fulfillment>;

  getFulfillment(id: string): Promise<Fulfillment | null>;

  listByOrder(orderId: string): Promise<Fulfillment[]>;

  listFulfillments(params?: {
    status?: FulfillmentStatus;
    limit?: number;
    offset?: number;
  }): Promise<Fulfillment[]>;

  updateStatus(id: string, status: FulfillmentStatus): Promise<Fulfillment | null>;

  addTracking(id: string, params: {
    carrier: string;
    trackingNumber: string;
    trackingUrl?: string;
  }): Promise<Fulfillment | null>;

  cancelFulfillment(id: string): Promise<Fulfillment | null>;
}
```

## Types

```ts
type FulfillmentStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

interface FulfillmentItem {
  lineItemId: string;
  quantity: number;
}

interface Fulfillment {
  id: string;
  orderId: string;
  status: FulfillmentStatus;
  items: FulfillmentItem[];
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## Store Components

### FulfillmentSummary

Displays all fulfillments for an order with status, item count, carrier, and tracking details.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | `string` | Yes | Order ID to look up fulfillments for |

#### Usage in MDX

```mdx
<FulfillmentSummary orderId="order_abc123" />
```

Use this component on an order detail or order confirmation page to show all fulfillment entries for a given order.

### FulfillmentTracker

Visual timeline showing fulfillment progress through each stage (pending, shipped, delivered), with timestamps and cancelled-state handling.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `FulfillmentStatus` | Yes | Current fulfillment status |
| `createdAt` | `string \| Date` | Yes | When the fulfillment was created |
| `shippedAt` | `string \| Date \| null` | No | When it was shipped, if applicable |
| `deliveredAt` | `string \| Date \| null` | No | When it was delivered, if applicable |

#### Usage in MDX

```mdx
<FulfillmentTracker status="shipped" createdAt="2026-03-01T12:00:00Z" shippedAt="2026-03-03T09:30:00Z" />
```

Use this component on an order tracking page to visualize the fulfillment pipeline as a step-by-step timeline.

### TrackingInfo

Compact tracking card showing carrier name, tracking number with link, and current fulfillment status badge.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `FulfillmentStatus` | Yes | Current fulfillment status |
| `carrier` | `string \| null` | No | Carrier name (e.g. UPS, FedEx) |
| `trackingNumber` | `string \| null` | No | Tracking number |
| `trackingUrl` | `string \| null` | No | Full tracking URL |

#### Usage in MDX

```mdx
<TrackingInfo status="shipped" carrier="UPS" trackingNumber="1Z999AA10123456784" trackingUrl="https://ups.com/track?num=1Z999AA10123456784" />
```

Use this component alongside order details to display shipping carrier and tracking information.

## Notes

- Requires the `orders` module (reads orderDetails and orderItems).
- Multiple fulfillments can be created per order, supporting partial and split shipments.
- Fulfillment items are stored as a JSON array (not a separate table).
- `shippedAt` is set automatically when status transitions to "shipped"; `deliveredAt` when "delivered".
- Store endpoints are read-only; all mutations require admin access.
