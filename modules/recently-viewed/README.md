# @86d-app/recently-viewed

Recently viewed products tracking module for the 86d commerce platform. Records which products customers browse and surfaces them for rediscovery, improving engagement and conversion.

## Features

- Track product views for authenticated and anonymous users
- Deduplicate repeat views within a 5-minute window
- Merge anonymous session history into customer account on login
- Admin dashboard with most viewed products analytics
- Two store components: full grid and compact horizontal strip

## Installation

Add `"recently-viewed"` to your template's `config.json` modules array:

```json
{
  "modules": ["cart", "products", "recently-viewed"]
}
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxViewsPerCustomer` | `string` | — | Maximum views retained per customer |

```ts
import recentlyViewed from "@86d-app/recently-viewed";

recentlyViewed({ maxViewsPerCustomer: "100" });
```

## Store Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/recently-viewed/track` | Record a product view |
| GET | `/recently-viewed` | List recently viewed products |
| POST | `/recently-viewed/clear` | Clear viewing history |
| POST | `/recently-viewed/merge` | Merge session views into customer (requires auth) |

### POST `/recently-viewed/track`

```json
{
  "productId": "prod_123",
  "productName": "Blue T-Shirt",
  "productSlug": "blue-t-shirt",
  "productImage": "/img/blue-tshirt.jpg",
  "productPrice": 2999,
  "sessionId": "sess_abc"
}
```

### GET `/recently-viewed`

Query params: `sessionId`, `take` (default 20), `skip`

### POST `/recently-viewed/merge`

Transfers anonymous session views to the authenticated customer. Call this on login.

```json
{
  "sessionId": "sess_abc"
}
```

## Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/recently-viewed` | List all views (filterable) |
| GET | `/admin/recently-viewed/popular` | Most viewed products |
| GET | `/admin/recently-viewed/customer/:id` | Views for a specific customer |
| DELETE | `/admin/recently-viewed/:id/delete` | Delete a view record |

## Controller API

```ts
interface RecentlyViewedController {
  trackView(params): Promise<ProductView>
  getRecentViews(params): Promise<ProductView[]>
  getPopularProducts(params?): Promise<PopularProduct[]>
  clearHistory(params): Promise<number>
  deleteView(id): Promise<boolean>
  listAll(params?): Promise<ProductView[]>
  countViews(params?): Promise<number>
  mergeHistory(params): Promise<number>
}
```

## Types

```ts
interface ProductView {
  id: string
  customerId?: string
  sessionId?: string
  productId: string
  productName: string
  productSlug: string
  productImage?: string
  productPrice?: number
  viewedAt: Date
}

interface PopularProduct {
  productId: string
  productName: string
  productSlug: string
  productImage?: string
  viewCount: number
}
```

## Notes

- All prices are stored in **cents** (not dollars)
- The dedup window is 5 minutes — viewing the same product again within 5 minutes updates the existing record
- Session views should be merged on login via the `/recently-viewed/merge` endpoint
- The admin "Most Viewed Products" panel shows the top 10 by default
