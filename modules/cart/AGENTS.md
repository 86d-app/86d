# Cart Module

Shopping cart for guest and registered customers. Supports adding, updating, removing items and cart expiration.

## Structure

```
src/
  index.ts          Factory: cart(options?) => Module + admin nav registration
  schema.ts         Zod models: cart, cartItem
  service.ts        CartController interface
  service-impl.ts   CartController implementation
  adapter.ts        CartAdapter interface + in-memory default
  routes.ts         Route definitions
  components/
    store/          Customer-facing MDX components
      index.tsx     Cart drawer, mini cart, add-to-cart button (.tsx logic)
      *.mdx         Store template variants
    admin/          Store admin MDX components
      index.tsx     Cart list table, cart detail view (.tsx logic)
      *.mdx         Admin template variants
  endpoints/
    store/          Customer-facing
      add-to-cart.ts        POST /cart
      get-cart.ts           GET  /cart/get
      clear-cart.ts         DELETE /cart/clear
      remove-from-cart.ts   DELETE /cart/items/:id/remove
      update-cart-item.ts   PUT  /cart/items/:id/update
    admin/          Protected (renders in store admin /admin/)
      list-carts.ts         GET  /admin/carts
      get-cart-details.ts   GET  /admin/carts/:id
      delete-cart.ts        DELETE /admin/carts/:id/delete
```

## Options

```ts
CartOptions {
  guestCartExpiration?: number  // ms, default 7 days (604800000)
  maxItemsPerCart?: number      // default 100
}
```

## Data models

- **cart**: id, customerId?, guestId?, status (active|abandoned|converted), expiresAt, metadata
- **cartItem**: id, cartId (FK cascade), productId, variantId?, quantity, price (snapshot), metadata

## Patterns

- Adapter pattern abstracts storage — swap the default in-memory adapter for any persistence layer
- Cart item IDs are deterministic: `${cartId}_${productId}[_${variantId}]`
- Supports both guest carts (guestId) and customer carts (customerId)
- Store endpoints return consistent shape: `{ cart, items, itemCount, subtotal }`
