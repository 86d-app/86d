# Products Module

Product catalog with variants, hierarchical categories, and collections. Full CRUD for admin, read-only browsing and search for storefront. Includes CSV import, bulk operations, and inventory management.

## Structure

```
src/
  index.ts          Factory: products(options?) => Module + admin nav
  schema.ts         Zod models: product, productVariant, category, collection, collectionProduct
  controllers.ts    Raw module controllers (ctx pattern for endpoint system)
  service.ts        TypeScript interface (ProductController)
  service-impl.ts   Clean typed implementation (createProductController)
  state.ts          MobX UI state (filters, sort, view mode)
  store/
    endpoints/      Customer-facing (9 endpoints)
    components/     Store MDX components
  admin/
    endpoints/      Protected (23 endpoints)
    components/     Admin UI components
  __tests__/
    controllers.test.ts          Raw controller tests (135 tests)
    service-impl.test.ts         Service layer tests (134 tests)
    endpoint-security.test.ts    Data integrity invariants
    state.test.ts                MobX state tests
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

- **product**: id, name, slug (unique), price, compareAtPrice, costPrice, sku?, inventory, trackInventory, allowBackorder, status (draft|active|archived), categoryId?, images[], tags[], metadata, weight/weightUnit, isFeatured
- **productVariant**: id, productId (FK cascade), name, sku?, price, inventory, options (Record<string,string>), images[], position
- **category**: id, name, slug (unique), parentId? (self-referential), position, isVisible, metadata
- **collection**: id, name, slug (unique), isFeatured, isVisible, position, metadata
- **collectionProduct**: id, collectionId (FK cascade), productId (FK cascade), position

## Key patterns

- Two controller layers: `controllers.ts` (raw ctx pattern for endpoints) and `service-impl.ts` (clean typed API with `createProductController(data)`)
- Service-impl uses `crypto.randomUUID()` for IDs; raw controllers use `Date.now()`
- Store endpoints only return active products; admin endpoints return all statuses
- Variant writes update parent product's `updatedAt`
- Category deletion orphans children and products (sets categoryId/parentId to undefined)
- Collection `getWithProducts` returns only active products; `listCollectionProducts` returns all
- `addProductToCollection` prevents duplicates (returns existing link)
- Import resolves categories by name (case-insensitive), deduplicates slugs, updates existing products by SKU
- Inventory decrement has NO floor — can go negative (documented behavior)
- Untracked products (`trackInventory: false`) skip inventory operations
- Related products scored: same category (+10), shared tags (+1 each)

## Gotchas

- `exactOptionalPropertyTypes` is on — use `undefined` carefully for optional fields
- Price fields in import are multiplied by 100 (dollars to cents)
- Category tree only includes visible categories
- Search is case-insensitive across name, description, and tags
