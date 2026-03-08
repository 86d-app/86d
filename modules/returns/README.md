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

# Returns Module

Manages customer return requests with a multi-step approval workflow. Supports line-item returns with reason and condition tracking, multiple refund methods, and return shipment tracking.

**Flow:** requested -> approved -> received -> completed. Admin can reject at any non-terminal stage. Customers can cancel before completion.

## Installation

```sh
npm install @86d-app/returns
```

## Usage

```ts
import returns from "@86d-app/returns";

const module = returns({
  returnWindowDays: 30,
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `returnWindowDays` | `number` | `30` | Maximum days after order placement to allow a return request |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/returns` | List the current customer's return requests |
| `POST` | `/returns/submit` | Submit a new return request with items |
| `GET` | `/returns/:id` | Get return request status and items |
| `POST` | `/returns/:id/cancel` | Cancel a return request |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/returns` | List all return requests (paginated) |
| `GET` | `/admin/returns/summary` | Get return statistics summary |
| `GET` | `/admin/returns/:id` | Get return request with items |
| `POST` | `/admin/returns/:id/approve` | Approve a return request |
| `POST` | `/admin/returns/:id/reject` | Reject a return request |
| `POST` | `/admin/returns/:id/received` | Mark items as received |
| `POST` | `/admin/returns/:id/complete` | Complete the return (set refund amount) |
| `POST` | `/admin/returns/:id/cancel` | Cancel a return request |
| `PUT` | `/admin/returns/:id/tracking` | Update return shipment tracking info |

## Controller API

The `ReturnController` interface is exported for inter-module use (e.g. store-credits issuing refunds on completion).

```ts
interface ReturnController {
  create(params: CreateReturnParams): Promise<ReturnRequestWithItems>;
  getById(id: string): Promise<ReturnRequestWithItems | null>;
  getByOrderId(orderId: string): Promise<ReturnRequest[]>;
  getByCustomerId(customerId: string, params?: { status?: ReturnStatus; take?: number; skip?: number }): Promise<ReturnRequest[]>;

  approve(id: string, adminNotes?: string): Promise<ReturnRequest | null>;
  reject(id: string, adminNotes?: string): Promise<ReturnRequest | null>;
  markReceived(id: string): Promise<ReturnRequest | null>;
  complete(id: string, refundAmount: number): Promise<ReturnRequest | null>;
  cancel(id: string): Promise<ReturnRequest | null>;

  updateTracking(id: string, trackingNumber: string, carrier?: string): Promise<ReturnRequest | null>;

  list(params?: { status?: ReturnStatus; take?: number; skip?: number }): Promise<ReturnRequest[]>;
  getSummary(): Promise<ReturnSummary>;
}
```

## Types

```ts
type ReturnStatus = "requested" | "approved" | "rejected" | "received" | "completed" | "cancelled";
type RefundMethod = "original_payment" | "store_credit" | "exchange";
type ItemReturnReason = "damaged" | "defective" | "wrong_item" | "not_as_described" | "changed_mind" | "too_small" | "too_large" | "other";
type ItemCondition = "unopened" | "opened" | "used" | "damaged";

interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  status: ReturnStatus;
  refundMethod: RefundMethod;
  refundAmount: number;
  currency: string;
  reason: string;
  customerNotes?: string;
  adminNotes?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  requestedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ReturnItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  reason: ItemReturnReason;
  condition: ItemCondition;
  notes?: string;
  createdAt: Date;
}

interface ReturnRequestWithItems extends ReturnRequest {
  items: ReturnItem[];
}

interface ReturnSummary {
  totalRequests: number;
  requested: number;
  approved: number;
  completed: number;
  rejected: number;
  totalRefundAmount: number;
}
```

## Notes

- Return requests are created with their line items in a single operation. Each item tracks its own reason and condition.
- The `refundAmount` is set by the admin at completion time, not when the customer submits the request.
- Events are emitted at each status transition (`return.requested`, `return.approved`, `return.rejected`, `return.received`, `return.completed`, `return.cancelled`, `return.refunded`) for integration with notifications and store-credits modules.
- The `returnRequest.orderId` references the orders module via a cascade foreign key.
