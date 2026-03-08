# Returns Module

Manages customer return requests with a multi-step approval workflow (requested -> approved -> received -> completed) and line-item tracking.

## Structure

```
src/
  index.ts          Factory: returns(options?) => Module
  schema.ts         Zod models: returnRequest, returnItem
  service.ts        ReturnController interface + types
  service-impl.ts   ReturnController implementation
  admin/
    components/
      index.tsx           Admin component exports
      returns-list.tsx    Returns list table (.tsx logic)
      returns-list.mdx    Admin template
      return-detail.tsx   Return detail view (.tsx logic)
      return-detail.mdx   Admin template
    endpoints/
      index.ts            Endpoint map
      list-returns.ts     GET  /admin/returns
      get-return.ts       GET  /admin/returns/:id
      return-summary.ts   GET  /admin/returns/summary
      approve-return.ts   POST /admin/returns/:id/approve
      reject-return.ts    POST /admin/returns/:id/reject
      mark-received.ts    POST /admin/returns/:id/received
      complete-return.ts  POST /admin/returns/:id/complete
      cancel-return.ts    POST /admin/returns/:id/cancel
      update-tracking.ts  PUT  /admin/returns/:id/tracking
  store/
    components/
      index.tsx           Store component exports
      return-form.tsx     Submit return form (.tsx logic)
      return-form.mdx     Store template
      return-status.tsx   Return status tracker (.tsx logic)
      return-status.mdx   Store template
    endpoints/
      index.ts            Endpoint map
      list-returns.ts     GET  /returns
      submit-return.ts    POST /returns/submit
      get-return.ts       GET  /returns/:id
      cancel-return.ts    POST /returns/:id/cancel
```

## Options

```ts
ReturnsOptions {
  returnWindowDays?: number  // days after order to allow returns, default 30
}
```

## Data models

- **returnRequest**: id, orderId (FK cascade to order), customerId, status (requested|approved|rejected|received|completed|cancelled), refundMethod (original_payment|store_credit|exchange), refundAmount, currency, reason, customerNotes?, adminNotes?, trackingNumber?, trackingCarrier?, requestedAt, resolvedAt?, createdAt, updatedAt
- **returnItem**: id, returnRequestId (FK cascade), orderItemId, productName, sku?, quantity, unitPrice, reason (damaged|defective|wrong_item|not_as_described|changed_mind|too_small|too_large|other), condition (unopened|opened|used|damaged), notes?, createdAt

## Patterns

- Flow: requested -> approved -> received -> completed; admin can reject at any non-terminal stage; customer can cancel before completion
- Return requests are created with line items in a single operation (`create` accepts `items[]`)
- `ReturnRequestWithItems` bundles the request with its items for detail views
- `refundAmount` is set at completion time by admin, not at request time
- Events emitted at each status transition for integration with notifications, store-credits, orders
- Summary endpoint returns counts by status + total refund amount
