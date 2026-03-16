# Walmart Module

Integrates with Walmart Marketplace for item management, feed submissions, order fulfillment, and inventory tracking.

## Structure

```
src/
  index.ts          Factory: walmart(options?) => Module + admin nav (Sales > Walmart)
  schema.ts         Zod models: item, walmartOrder, feedSubmission
  service.ts        WalmartController interface
  service-impl.ts   WalmartController implementation via ModuleDataService
  store/endpoints/  (empty)
  admin/endpoints/  (empty)
  admin/components/ index.tsx, walmart-admin.tsx, walmart-admin.mdx
  __tests__/        service-impl.test.ts
```

## Options

```ts
interface WalmartOptions extends ModuleConfig {
  clientId?: string;      // Walmart API client ID
  clientSecret?: string;  // Walmart API client secret
  partnerId?: string;     // Walmart partner ID
}
```

## Data Models

- **WalmartItem** -- id, localProductId, walmartItemId, sku, title, status (published|unpublished|retired|system-error), lifecycleStatus (active|archived), price, quantity, upc, gtin, brand, category, fulfillmentType (seller|wfs), publishStatus, lastSyncedAt, error, metadata
- **WalmartOrder** -- id, purchaseOrderId, status (created|acknowledged|shipped|delivered|cancelled|refunded), items, orderTotal, shippingTotal, walmartFee, tax, customerName, shippingAddress, trackingNumber, carrier, shipDate, estimatedDelivery
- **FeedSubmission** -- id, feedId, feedType (item|inventory|price|order), status (pending|processing|completed|error), totalItems, successItems, errorItems, error, submittedAt, completedAt
- **ChannelStats** -- totalItems, publishedItems, totalOrders, totalRevenue, pendingFeeds, errorItems
- **ItemHealth** -- total, published, unpublished, retired, systemError, sellerFulfilled, wfsFulfilled

## Patterns

- Controller key: `walmart`
- Events emitted: `walmart.item.synced`, `walmart.item.retired`, `walmart.order.received`, `walmart.order.shipped`, `walmart.feed.submitted`, `walmart.inventory.updated`
- Exports read fields: `itemTitle`, `itemStatus`, `itemPrice`, `walmartItemId`
- `retireItem()` sets status to `retired` and lifecycleStatus to `archived`
- `acknowledgeOrder()` transitions order from `created` to `acknowledged`
- Feed types: `item`, `inventory`, `price`, `order`
- No store or admin endpoints are wired yet (both empty objects)
