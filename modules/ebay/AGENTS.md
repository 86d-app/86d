# eBay Module

eBay marketplace integration for fixed-price and auction listings, order management, and channel analytics.

## Structure

```
src/
  index.ts          Factory: ebay(options?) => Module + admin nav (Sales group)
  schema.ts         Zod models: listing, ebayOrder
  service.ts        EbayController interface
  service-impl.ts   EbayController implementation via ModuleDataService
  store/endpoints/  (empty)
  admin/endpoints/  (empty)
  admin/components/ index.tsx, ebay-admin.tsx, ebay-admin.mdx
  __tests__/        service-impl.test.ts
```

## Options

```ts
interface EbayOptions extends ModuleConfig {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  siteId?: string; // default: "EBAY_US"
}
```

## Data models

- **EbayListing** - localProductId, ebayItemId, title, status (active|ended|sold|draft|error), listingType (fixed-price|auction), price, auctionStartPrice, currentBid, bidCount, quantity, condition, categoryId, duration, startTime, endTime, watchers, views, metadata
- **EbayOrder** - ebayOrderId, status (pending|paid|shipped|delivered|cancelled|returned), items, subtotal, shippingCost, ebayFee, paymentProcessingFee, total, buyerUsername, buyerName, shippingAddress, trackingNumber, carrier
- **ChannelStats** - totalListings, activeListings, totalOrders, totalRevenue, activeAuctions, averagePrice

## Patterns

- Controller registered as `controllers.ebay`
- Supports both fixed-price and auction listing types
- `endListing()` sets status to "ended" and records endTime
- `getActiveAuctions()` filters by status=active AND listingType=auction
- No admin or store endpoints are wired yet (both export empty objects)
- Admin page: `/admin/ebay` (single page)
- Events: `ebay.listing.created`, `ebay.listing.ended`, `ebay.order.received`, `ebay.order.shipped`, `ebay.bid.received`, `ebay.catalog.synced`
