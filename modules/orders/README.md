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

# Orders Module

📚 **Documentation:** [86d.app/docs/modules/orders](https://86d.app/docs/modules/orders)

Full order lifecycle management. Handles order creation, status transitions, fulfillment tracking, returns, invoices, notes, bulk operations, guest tracking, and reordering.

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
| `POST` | `/orders/me/:id/cancel` | Cancel a pending/processing/on_hold order |
| `GET` | `/orders/me/:id/fulfillments` | List fulfillments with overall status |
| `GET` | `/orders/me/:id/invoice` | Get invoice data for an order |
| `GET` | `/orders/me/:id/returns` | List return requests for an order |
| `POST` | `/orders/me/:id/returns/create` | Submit a return request |
| `GET` | `/orders/me/returns` | List all returns across orders |
| `POST` | `/orders/me/:id/reorder` | Get cart-ready items from a previous order |
| `POST` | `/orders/track` | Guest order tracking (order number + email) |
| `GET` | `/orders/store-search` | Store search integration |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/orders` | List orders (filterable by status, payment, search) |
| `GET` | `/admin/orders/:id` | Get full order with items and addresses |
| `PUT` | `/admin/orders/:id` | Update status, payment, notes, metadata |
| `DELETE` | `/admin/orders/:id` | Hard-delete an order |
| `GET` | `/admin/orders/export` | Export orders with details (date range support) |
| `POST` | `/admin/orders/bulk` | Bulk update status, payment, or delete |
| `GET` | `/admin/orders/:id/fulfillments` | List fulfillments for an order |
| `POST` | `/admin/orders/:id/fulfillments/create` | Create a fulfillment with items |
| `PUT` | `/admin/fulfillments/:id/update` | Update fulfillment tracking/status |
| `DELETE` | `/admin/fulfillments/:id/delete` | Delete a fulfillment |
| `GET` | `/admin/orders/:id/notes` | List notes for an order |
| `POST` | `/admin/orders/:id/notes/add` | Add a note to an order |
| `POST` | `/admin/orders/notes/:id/delete` | Delete a note |
| `GET` | `/admin/returns` | List all returns (filterable by status) |
| `GET` | `/admin/returns/:id` | Get return with items and order context |
| `PUT` | `/admin/returns/:id/update` | Update return status, notes, refund |
| `DELETE` | `/admin/returns/:id/delete` | Delete a return request |
| `GET` | `/admin/orders/:id/returns` | List returns for a specific order |

## Status Flows

```
Order status:
  pending → processing → on_hold → completed
                                 ↘ cancelled
                                 ↘ refunded

Payment status:
  unpaid → paid → partially_paid → refunded
                ↘ voided

Return status:
  requested → approved → shipped_back → received → refunded → completed
            → rejected

Fulfillment status:
  unfulfilled | partially_fulfilled | fulfilled
```

Orders can only be cancelled when status is `pending`, `processing`, or `on_hold`.

## Events

| Event | Trigger |
|---|---|
| `order.placed` | Order created |
| `order.updated` | Order metadata changed |
| `order.fulfilled` | Order completed |
| `order.cancelled` | Order cancelled |
| `order.shipped` | Fulfillment shipped with tracking |
| `shipment.delivered` | Fulfillment delivered |
| `return.requested` | Return created |
| `return.approved` | Return approved |
| `return.rejected` | Return rejected |
| `return.refunded` | Return refunded |
| `return.completed` | Return completed |

## Controller API

```ts
interface OrderController {
  // Order CRUD
  create(params: CreateOrderParams): Promise<Order>;
  getById(id: string): Promise<OrderWithDetails | null>;
  getByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null>;
  listForCustomer(customerId: string, params?): Promise<{ orders; total }>;
  list(params): Promise<{ orders; total }>;
  listForExport(params): Promise<{ orders: OrderWithDetails[]; total }>;
  updateStatus(id: string, status: OrderStatus): Promise<Order | null>;
  updatePaymentStatus(id, paymentStatus): Promise<Order | null>;
  update(id, { notes?, metadata? }): Promise<Order | null>;
  cancel(id: string): Promise<Order | null>;
  delete(id: string): Promise<void>;
  getItems(orderId: string): Promise<OrderItem[]>;
  getAddresses(orderId: string): Promise<OrderAddress[]>;

  // Fulfillments
  createFulfillment(params): Promise<Fulfillment>;
  getFulfillment(id: string): Promise<FulfillmentWithItems | null>;
  listFulfillments(orderId: string): Promise<FulfillmentWithItems[]>;
  updateFulfillment(id, params): Promise<Fulfillment | null>;
  deleteFulfillment(id: string): Promise<void>;
  getOrderFulfillmentStatus(orderId): Promise<OrderFulfillmentStatus>;

  // Returns
  createReturn(params): Promise<ReturnRequest>;
  getReturn(id: string): Promise<ReturnRequestWithItems | null>;
  listReturns(orderId: string): Promise<ReturnRequestWithItems[]>;
  listAllReturns(params): Promise<{ returns; total }>;
  updateReturn(id, params): Promise<ReturnRequest | null>;
  deleteReturn(id: string): Promise<void>;
  listReturnsForCustomer(customerId, params?): Promise<{ returns; total }>;

  // Bulk Operations
  bulkUpdateStatus(ids, status): Promise<{ updated: number }>;
  bulkUpdatePaymentStatus(ids, paymentStatus): Promise<{ updated: number }>;
  bulkDelete(ids): Promise<{ deleted: number }>;

  // Notes
  addNote(params): Promise<OrderNote>;
  listNotes(orderId: string): Promise<OrderNote[]>;
  deleteNote(id: string): Promise<void>;

  // Invoice, Tracking, Reorder
  getInvoiceData(orderId, storeName): Promise<InvoiceData | null>;
  getByTracking(orderNumber, email): Promise<OrderWithDetails | null>;
  getReorderItems(orderId): Promise<ReorderItem[] | null>;
}
```

## Types

```ts
type OrderStatus = "pending" | "processing" | "on_hold" | "completed" | "cancelled" | "refunded";
type PaymentStatus = "unpaid" | "paid" | "partially_paid" | "refunded" | "voided";
type ReturnStatus = "requested" | "approved" | "rejected" | "shipped_back" | "received" | "refunded" | "completed";
type ReturnType = "refund" | "exchange" | "store_credit";
type OrderFulfillmentStatus = "unfulfilled" | "partially_fulfilled" | "fulfilled";
```

## Store Components

### OrderHistory

Paginated list of a customer's orders. Requires authentication.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelectOrder` | `(id: string) => void` | — | Callback when an order is clicked |
| `pageSize` | `number` | `10` | Orders per page |

### OrderDetail

Full order view with items, totals, fulfillment, addresses, and cancel button.

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | `string` | Order ID to display |
| `onBack` | `() => void` | Back navigation callback |

### OrderReturns

Return requests section. Shows existing returns and form to submit new ones.

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | `string` | Order ID |
| `items` | `OrderItem[]` | Order items for return selection |
| `orderStatus` | `string` | Current status (returns allowed for completed/processing) |

### OrderTracker

Public order tracking form (no auth required). Matches order number + email.

## Notes

- Order numbers auto-generated as `ORD-{base36timestamp}-{random}`.
- Item `name` and `price` are snapshotted at creation and don't update with catalog changes.
- Customer endpoints verify `order.customerId === session.user.id` (return 404, not 403).
- Tracking URLs auto-generated for UPS, USPS, FedEx, DHL carriers.
- `bulkDelete` cascades: items, addresses, fulfillments, returns, and notes.
- Invoice numbers: `INV-{YYYYMMDD}-{orderSuffix}`.
