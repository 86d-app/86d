# Reviews Module — Store Components

## ReviewsSummary

Compact star rating and count for product cards.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `productId` | `string` | Product ID to fetch review summary for |

### Usage in MDX

```mdx
<ReviewsSummary productId={product.id} />
```

## ProductReviews

Full reviews section with summary, distribution bars, review list, and submit form.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `productId` | `string` | — | Product ID |
| `title` | `string` | `"Customer Reviews"` | Section heading |

### Usage in MDX

```mdx
<ProductReviews productId={product.id} />
```
