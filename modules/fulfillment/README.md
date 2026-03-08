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

## Notes

- Requires the `orders` module (reads orderDetails and orderItems).
- Multiple fulfillments can be created per order, supporting partial and split shipments.
- Fulfillment items are stored as a JSON array (not a separate table).
- `shippedAt` is set automatically when status transitions to "shipped"; `deliveredAt` when "delivered".
- Store endpoints are read-only; all mutations require admin access.
