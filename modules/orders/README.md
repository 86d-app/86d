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

# @86d-app/orders

Order lifecycle management. Handles order creation, status transitions, and customer/admin access to order history. Designed to be called by the checkout module on order confirmation.

## Installation

```sh
npm install @86d-app/orders
```

## Usage

```ts
import orders from "@86d-app/orders";

const module = orders({
  currency: "USD",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `currency` | `string` | `"USD"` | Default currency code for new orders |

## Store Endpoints

All store endpoints require an authenticated session.

| Method | Path | Description |
|---|---|---|
| `GET` | `/orders/me` | List all orders for the authenticated customer |
| `GET` | `/orders/me/:id` | Get a specific order (with items and addresses) |
| `POST` | `/orders/me/:id/cancel` | Request cancellation of a pending/processing order |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/orders` | List all orders (filterable by status, payment status) |
| `GET` | `/admin/orders/:id` | Get a full order with items and addresses |
| `PUT` | `/admin/orders/:id/update` | Update order notes or metadata |
| `DELETE` | `/admin/orders/:id/delete` | Hard-delete an order |

## Status Flows

```
Order status:
  pending → processing → on_hold → completed
                                 ↘ cancelled
                                 ↘ refunded

Payment status:
  unpaid → paid → partially_paid → refunded
                ↘ voided
```

Orders can only be cancelled when their status is `pending`, `processing`, or `on_hold`. Attempting to cancel a `completed`, `cancelled`, or `refunded` order returns `null`.

## Controller API

```ts
interface OrderController {
  /** Create a new order with line items and optional addresses */
  create(params: CreateOrderParams): Promise<Order>;

  /** Get a full order by ID (includes items and addresses) */
  getById(id: string): Promise<OrderWithDetails | null>;

  /** Get a full order by its human-readable order number */
  getByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null>;

  /** List orders for a specific customer */
  listForCustomer(
    customerId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<{ orders: Order[]; total: number }>;

  /** List all orders (admin) with optional filters */
  list(params: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }): Promise<{ orders: Order[]; total: number }>;

  /** Transition the fulfillment status of an order */
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;

  /** Transition the payment status of an order */
  updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<Order | null>;

  /** Update free-form notes or metadata on an order */
  update(
    id: string,
    params: {
      notes?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Order | null>;

  /**
   * Cancel an order. Returns null if the order is not cancellable
   * (i.e. already completed, cancelled, or refunded).
   */
  cancel(id: string): Promise<Order | null>;

  /** Hard-delete an order (admin only) */
  delete(id: string): Promise<void>;

  /** Get the line items for an order */
  getItems(orderId: string): Promise<OrderItem[]>;

  /** Get the billing and shipping addresses for an order */
  getAddresses(orderId: string): Promise<OrderAddress[]>;
}
```

## Types

```ts
type OrderStatus =
  | "pending"
  | "processing"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "refunded";

type PaymentStatus =
  | "unpaid"
  | "paid"
  | "partially_paid"
  | "refunded"
  | "voided";

interface Order {
  id: string;
  /** Auto-generated: "ORD-{base36timestamp}-{random}" */
  orderNumber: string;
  customerId?: string;
  guestEmail?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;            // in cents
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string;
  name: string;                // snapshot at time of purchase
  sku?: string;
  price: number;               // snapshot in cents
  quantity: number;
  subtotal: number;
  metadata?: Record<string, unknown>;
}

interface OrderAddress {
  id: string;
  orderId: string;
  type: "billing" | "shipping";
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface OrderWithDetails extends Order {
  items: OrderItem[];
  addresses: OrderAddress[];
}

interface CreateOrderParams {
  id?: string;
  customerId?: string;
  guestEmail?: string;
  currency?: string;
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  total: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  items: Array<{
    productId: string;
    variantId?: string;
    name: string;
    sku?: string;
    price: number;
    quantity: number;
  }>;
  billingAddress?: Omit<OrderAddress, "id" | "orderId" | "type">;
  shippingAddress?: Omit<OrderAddress, "id" | "orderId" | "type">;
}
```

## Notes

- Order numbers are auto-generated as `ORD-{base36timestamp}-{random}` and are guaranteed unique.
- Item `name` and `price` are snapshotted at creation time and do not reflect future catalog changes.
- Customer-facing endpoints verify that `order.customerId === session.user.id` before returning data.
- The `OrderController` type is exported for use in the checkout module and other inter-module contracts.
