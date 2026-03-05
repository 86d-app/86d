# Orders Module

Order lifecycle management. Supports creating orders, tracking status transitions, and customer/admin access to order history.

## Structure

```
src/
  index.ts          Factory: orders(options?) => Module
  schema.ts         Zod models: order, orderItem, orderAddress
  service.ts        OrderController interface + types
  service-impl.ts   OrderController implementation
  endpoints/
    store/          Customer-facing (requires session)
      list-orders.ts        GET  /orders/me
      get-order.ts          GET  /orders/me/:id
      cancel-order.ts       POST /orders/me/:id/cancel
    admin/          Protected (store admin only)
      list-orders.ts        GET  /admin/orders
      get-order.ts          GET  /admin/orders/:id
      update-order.ts       PUT  /admin/orders/:id/update
      delete-order.ts       DELETE /admin/orders/:id/delete
  __tests__/
    service-impl.test.ts    24 tests
```

## Options

```ts
OrdersOptions {
  currency?: string  // default "USD"
}
```

## Data models

- **order**: id, orderNumber (unique, auto-gen "ORD-{timestamp}-{random}"), customerId?, guestEmail?, status, paymentStatus, subtotal, taxAmount, shippingAmount, discountAmount, total, currency, notes?, metadata, createdAt, updatedAt
- **orderItem**: id, orderId (FK), productId, variantId?, name (snapshot), sku?, price (snapshot), quantity, subtotal, metadata
- **orderAddress**: id, orderId (FK), type (billing|shipping), firstName, lastName, company?, line1, line2?, city, state, postalCode, country, phone?

## Status flows

```
Order status:   pending → processing → on_hold → completed
                                               ↘ cancelled
                                               ↘ refunded
Payment status: unpaid → paid → partially_paid → refunded
                              ↘ voided
```

Cancellable statuses: `pending`, `processing`, `on_hold`
Non-cancellable: `completed`, `cancelled`, `refunded`

## Exports (for inter-module contracts)

Types exported: `Order`, `OrderItem`, `OrderAddress`, `OrderWithDetails`, `OrderController`, `CreateOrderParams`, `OrderStatus`, `PaymentStatus`

The checkout module can create orders by getting the `order` controller from the runtime context.

## Patterns

- Customer endpoints verify `order.customerId === userId` before returning
- `getById` returns `OrderWithDetails` (includes items + addresses)
- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`
- `findMany` uses `take` (not `limit`) for option queries
