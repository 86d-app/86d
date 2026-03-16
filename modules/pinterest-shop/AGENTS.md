# Pinterest Shop Module

Integrates with Pinterest for catalog management, shopping pin creation, and pin analytics tracking.

## Structure

```
src/
  index.ts          Factory: pinterestShop(options?) => Module + admin nav (Sales > Pinterest Shop)
  schema.ts         Zod models: catalogItem, shoppingPin, catalogSync
  service.ts        PinterestShopController interface
  service-impl.ts   PinterestShopController implementation via ModuleDataService
  store/endpoints/  (empty)
  admin/endpoints/  (empty)
  admin/components/ index.tsx, pinterest-shop-admin.mdx, pinterest-shop-admin.tsx
  __tests__/        service-impl.test.ts
```

## Options

```ts
interface PinterestShopOptions extends ModuleConfig {
  accessToken?: string;   // Pinterest API access token
  adAccountId?: string;   // Pinterest ad account ID
  catalogId?: string;     // Pinterest catalog ID
}
```

## Data Models

- **CatalogItem** -- id, localProductId, pinterestItemId, title, description, status (active|inactive|disapproved), link, imageUrl, price, salePrice, availability (in-stock|out-of-stock|preorder), googleCategory, lastSyncedAt, error
- **ShoppingPin** -- id, catalogItemId, pinId, boardId, title, description, link, imageUrl, impressions, saves, clicks
- **CatalogSync** -- id, status (pending|syncing|synced|failed), totalItems, syncedItems, failedItems, error, startedAt, completedAt
- **PinAnalytics** -- impressions, saves, clicks, clickRate, saveRate
- **ChannelStats** -- totalCatalogItems, activeCatalogItems, totalPins, totalImpressions, totalClicks, totalSaves

## Patterns

- Controller key: `pinterestShop`
- Events emitted: `pinterest.product.synced`, `pinterest.pin.created`, `pinterest.order.received`, `pinterest.catalog.synced`, `pinterest.webhook.received`
- Exports read fields: `catalogItemTitle`, `catalogItemStatus`, `catalogItemPrice`, `pinterestItemId`
- No store or admin endpoints are wired yet (both empty objects)
- `syncCatalog()` syncs only active items and immediately marks as synced
- `getPinAnalytics()` computes clickRate and saveRate from impressions
