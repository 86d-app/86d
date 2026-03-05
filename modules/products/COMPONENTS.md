# Products Module — Store Components

Components exported for use in store MDX templates. Import via the component registry (auto-registered when the module is in `templates/brisa/config.json`).

## ProductCard

Displays a single product card with image, name, price, discount badge, and optional "Add to Cart" button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `Product` | — | Product object with id, name, slug, price, images, etc. |
| `showAddToCart` | `boolean` | `true` | Show the "Add to Cart" button |

### Usage in MDX

```mdx
<ProductCard product={product} />

<ProductCard product={product} showAddToCart={false} />
```

## FeaturedProducts

Displays a responsive grid of featured products. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | `number` | — | Max number of featured products to display |
| `title` | `string` | — | Section heading |

### Usage in MDX

```mdx
<FeaturedProducts />

<FeaturedProducts limit={4} title="Staff Picks" />
```

## ProductListing

Full product listing with search, category/price/stock/tag filters, sorting, and pagination. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialCategory` | `string` | — | Pre-select a category filter |
| `initialSearch` | `string` | — | Pre-fill the search query |
| `pageSize` | `number` | — | Products per page |

### Usage in MDX

```mdx
<ProductListing />

<ProductListing initialCategory="shoes" pageSize={12} />
```

## ProductDetail

Full product detail page with image gallery, variant selector, pricing, inventory status, reviews, and related products. Fetches its own data.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `slug` | `string` | Product slug (from URL) |
| `params` | `Record<string, string>` | Route params (params.slug) |

### Usage

Loaded dynamically by the store catch-all route for `/products/:slug`.

## RelatedProducts

Horizontal grid of related products for a given product. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `productId` | `string` | — | Product ID to find related products for |
| `limit` | `number` | — | Max related products to show |
| `title` | `string` | — | Section heading |

### Usage in MDX

```mdx
<RelatedProducts productId={product.id} />

<RelatedProducts productId={product.id} limit={4} title="You may also like" />
```

## CollectionCard

Displays a single collection card with image, name, and description.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `collection` | `CollectionCardData` | Collection object with id, name, slug, description, image |

### Usage in MDX

```mdx
<CollectionCard collection={collection} />
```

## CollectionGrid

Grid of collections with optional featured-only filtering. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Section heading |
| `featured` | `boolean` | — | Only show featured collections |

### Usage in MDX

```mdx
<CollectionGrid />

<CollectionGrid title="Shop by Category" featured={true} />
```

## CollectionDetail

Full collection page with image, description, product count, and products grid. Fetches its own data.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `slug` | `string` | Collection slug (from URL) |
| `params` | `Record<string, string>` | Route params (params.slug) |

### Usage

Loaded dynamically by the store catch-all route for `/collections/:slug`.

## FilterChip

Small removable tag displaying an active filter. Used internally by ProductListing.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Filter display text |
| `onRemove` | `() => void` | Callback when the chip is dismissed |

### Usage in MDX

```mdx
<FilterChip label="Shoes" onRemove={handleRemove} />
```

## StarDisplay

Read-only star rating display.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rating` | `number` | — | Rating value (0–5) |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Star size |

### Usage in MDX

```mdx
<StarDisplay rating={4.5} />

<StarDisplay rating={product.averageRating} size="sm" />
```

## StarPicker

Interactive star rating input for review submission.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `number` | Current rating value |
| `onChange` | `(n: number) => void` | Callback when user selects a rating |

### Usage in MDX

```mdx
<StarPicker value={rating} onChange={setRating} />
```

## StockBadge

Inventory status badge. Shows "Out of stock", "Only X left", or "In stock".

### Props

| Prop | Type | Description |
|------|------|-------------|
| `inventory` | `number` | Available inventory count |

### Usage in MDX

```mdx
<StockBadge inventory={product.inventory} />
```

## ProductReviewsSection

Complete review section with rating summary, review list with pagination, and review submission form. Fetches its own data.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `productId` | `string` | Product ID to show reviews for |

### Usage in MDX

```mdx
<ProductReviewsSection productId={product.id} />
```
