# Products Module

Product catalog with variants and hierarchical categories. Full CRUD for admin, read-only browsing and search for storefront.

## Structure

```
src/
  index.ts          Factory: products(options?) => Module + admin nav registration
  schema.ts         Zod models: product, productVariant, category
  controllers.ts    All business logic (product, variant, category controllers)
  components/
    store/          Customer-facing MDX components
      index.tsx     ProductCard, ProductGrid, CategoryList, CategoryItem (.tsx logic)
      *.mdx         Store template variants
    admin/          Store admin MDX components
      index.tsx     Product table, product editor, category manager (.tsx logic)
      *.mdx         Admin template variants
  endpoints/
    store/          Customer-facing (6 endpoints)
      list-products.ts      GET  /products
      get-product.ts        GET  /products/:id (by ID or slug)
      get-featured.ts       GET  /products/featured
      search-products.ts    GET  /products/search?q=
      list-categories.ts    GET  /categories
      get-category.ts       GET  /categories/:id
    admin/          Protected (12 endpoints)
      create-product.ts     POST   /admin/products
      list-products.ts      GET    /admin/products/list
      get-product.ts        GET    /admin/products/:id
      update-product.ts     PUT    /admin/products/:id
      delete-product.ts     DELETE /admin/products/:id
      create-variant.ts     POST   /admin/products/:productId/variants
      update-variant.ts     PUT    /admin/variants/:id
      delete-variant.ts     DELETE /admin/variants/:id
      create-category.ts    POST   /admin/categories
      list-categories.ts    GET    /admin/categories/list
      update-category.ts    PUT    /admin/categories/:id
      delete-category.ts    DELETE /admin/categories/:id
```

## Options

```ts
ProductsOptions {
  defaultPageSize?: number   // default 20
  maxPageSize?: number       // default 100
  trackInventory?: boolean   // default true
}
```

## Data models

- **product**: id, name, slug (unique), price, compareAtPrice, costPrice, sku?, inventory, status (draft|active|archived), categoryId?, images[], tags[], isFeatured, weight/weightUnit
- **productVariant**: id, productId (FK cascade), name, sku?, price, inventory, options (Record<string,string> for size/color/etc.), position
- **category**: id, name, slug (unique), parentId? (self-referential for hierarchy), position, isVisible

## Patterns

- Uses core data layer directly (no adapter) — `data.get()`, `data.findMany()`, `data.upsert()`, `data.delete()`
- Product IDs: `prod_${timestamp}`, variant IDs: `var_${timestamp}`
- Store endpoints only return active products; admin endpoints return all statuses
- Variant writes also update parent product's `updatedAt`
- Category deletion orphans children and products (sets their categoryId to null)
- `getTree()` builds hierarchical category structure from flat list
