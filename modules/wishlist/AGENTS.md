# Wishlist Module

Customer wishlists for saving and tracking favorite products across sessions.

## Structure

```
src/
  index.ts          Factory: wishlist(options?) => Module
  schema.ts         Data model: wishlistItem
  service.ts        WishlistController interface
  service-impl.ts   WishlistController implementation
  store/
    components/     Store-facing MDX + TSX (button, page, heart icon)
    endpoints/
      store-search.ts          GET  /wishlist/store-search (search integration)
      list-wishlist.ts         GET  /wishlist
      add-to-wishlist.ts       POST /wishlist/add
      remove-from-wishlist.ts  DELETE /wishlist/remove/:id
      check-wishlist.ts        GET  /wishlist/check/:productId
  admin/
    components/     Admin MDX + TSX (overview)
    endpoints/
      list-all-wishlists.ts    GET    /admin/wishlist
      wishlist-summary.ts      GET    /admin/wishlist/summary
      delete-wishlist-item.ts  DELETE /admin/wishlist/:id/delete
```

## Options

```ts
WishlistOptions {
  maxItems?: string  // max items per customer wishlist
}
```

## Data model

- **wishlistItem**: id, customerId, productId, productName, productImage?, note?, addedAt

## Events

- Emits: `wishlist.itemAdded`, `wishlist.itemRemoved`

## Patterns

- Registers `search: { store: "/wishlist/store-search" }` for search module integration
- Duplicate add (same customerId + productId) returns the existing item, no error
- `removeByProduct(customerId, productId)` deletes all matching items for that pair
- `getSummary()` returns top 10 most-wishlisted products
- Exports read: `wishlistItemCount`, `isInWishlist`
