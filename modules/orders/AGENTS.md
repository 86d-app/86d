# Orders Module

Order lifecycle management: CRUD, status transitions, fulfillments, returns, invoices, notes, bulk operations, guest tracking, and reordering.

## Structure

```
src/
  index.ts          Factory: orders(options?) => Module
  schema.ts         Zod models: order, orderItem, orderAddress, fulfillment, fulfillmentItem, returnRequest, returnItem, orderNote
  service.ts        OrderController interface + all types
  service-impl.ts   OrderController implementation (35 methods)
  store/
    endpoints/      Customer-facing (requires session)
      list-orders.ts              GET  /orders/me
      get-order.ts                GET  /orders/me/:id
      cancel-order.ts             POST /orders/me/:id/cancel
      get-fulfillments.ts         GET  /orders/me/:id/fulfillments
      get-invoice.ts              GET  /orders/me/:id/invoice
      get-returns.ts              GET  /orders/me/:id/returns
      create-return.ts            POST /orders/me/:id/returns/create
      list-my-returns.ts          GET  /orders/me/returns
      reorder.ts                  POST /orders/me/:id/reorder
      track-order.ts              POST /orders/track
      store-search.ts             GET  /orders/store-search
    components/     Store UI (OrderHistory, OrderDetail, OrderReturns, OrderTracker)
  admin/
    endpoints/      Protected (admin only)
      list-orders.ts              GET    /admin/orders
      get-order.ts                GET    /admin/orders/:id
      update-order.ts             PUT    /admin/orders/:id
      delete-order.ts             DELETE /admin/orders/:id
      export-orders.ts            GET    /admin/orders/export
      bulk-action.ts              POST   /admin/orders/bulk
      list-fulfillments.ts        GET    /admin/orders/:id/fulfillments
      create-fulfillment.ts       POST   /admin/orders/:id/fulfillments/create
      update-fulfillment.ts       PUT    /admin/fulfillments/:id/update
      delete-fulfillment.ts       DELETE /admin/fulfillments/:id/delete
      list-notes.ts               GET    /admin/orders/:id/notes
      add-note.ts                 POST   /admin/orders/:id/notes/add
      delete-note.ts              POST   /admin/orders/notes/:id/delete
      list-returns.ts             GET    /admin/returns
      get-return.ts               GET    /admin/returns/:id
      update-return.ts            PUT    /admin/returns/:id/update
      delete-return.ts            DELETE /admin/returns/:id/delete
      list-order-returns.ts       GET    /admin/orders/:id/returns
    components/     Admin UI (OrderList, OrderDetail, OrderActivity, OrderInvoice, ReturnList)
  __tests__/
    service-impl.test.ts          132 tests (core controller logic)
    controllers.test.ts           58 tests (edge cases, data integrity)
    endpoint-security.test.ts     22 tests (customer isolation, tracking security)
```

## Options

```ts
OrdersOptions {
  currency?: string  // default "USD"
}
```

## Data models

- **order**: id, orderNumber (unique, auto-gen), customerId?, guestEmail?, status, paymentStatus, subtotal, taxAmount, shippingAmount, discountAmount, total, currency, notes?, metadata, createdAt, updatedAt
- **orderItem**: id, orderId (FK), productId, variantId?, name (snapshot), sku?, price (snapshot), quantity, subtotal, metadata
- **orderAddress**: id, orderId (FK), type (billing|shipping), firstName, lastName, company?, line1, line2?, city, state, postalCode, country, phone?
- **fulfillment**: id, orderId (FK), status, trackingNumber?, trackingUrl?, carrier?, notes?, shippedAt?, deliveredAt?, createdAt, updatedAt
- **fulfillmentItem**: id, fulfillmentId (FK), orderItemId, quantity
- **returnRequest**: id, orderId (FK), status, type (refund|exchange|store_credit), reason, customerNotes?, adminNotes?, refundAmount?, trackingNumber?, trackingUrl?, carrier?, createdAt, updatedAt
- **returnItem**: id, returnRequestId (FK), orderItemId, quantity, reason?
- **orderNote**: id, orderId (FK), type (note|system), content, authorId?, authorName?, metadata, createdAt

## Status flows

```
Order:   pending → processing → on_hold → completed | cancelled | refunded
Payment: unpaid → paid → partially_paid | refunded | voided
Return:  requested → approved → shipped_back → received → refunded → completed
                   → rejected
Fulfillment: unfulfilled | partially_fulfilled | fulfilled
```

Cancellable: `pending`, `processing`, `on_hold`. Non-cancellable: `completed`, `cancelled`, `refunded`.

## Events emitted

`order.placed`, `order.updated`, `order.fulfilled`, `order.cancelled`, `order.shipped`, `shipment.delivered`, `return.requested`, `return.approved`, `return.rejected`, `return.refunded`, `return.completed`

## Key patterns

- Customer endpoints verify `order.customerId === userId` (return 404, not 403)
- Guest tracking matches email case-insensitively against guestEmail and metadata.customerEmail
- `bulkDelete` cascades: items, addresses, fulfillments (with fulfillmentItems), returns (with returnItems), notes
- Tracking URLs auto-generated for UPS, USPS, FedEx, DHL carriers
- Invoice numbers: `INV-{YYYYMMDD}-{orderSuffix}`
- `findMany` uses `take`/`skip` for pagination
- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`

## Exports (for inter-module contracts)

`Order`, `OrderItem`, `OrderAddress`, `OrderWithDetails`, `OrderController`, `CreateOrderParams`, `OrderStatus`, `PaymentStatus`
