# Blog Module — Store Components

## BlogList

Lists blog posts with optional category and tag filters.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | `number` | `20` | Max posts to show |
| `category` | `string` | — | Filter by category |
| `tag` | `string` | — | Filter by tag |

### Usage in MDX

```mdx
<BlogList />
<BlogList limit={10} category="News" />
```

## BlogPostDetail

Blog post detail page. Used as a store page component (receives `params.slug` from route).

### Props

| Prop | Type | Description |
|------|------|-------------|
| `slug` | `string` | Post slug (from URL) |
| `params` | `Record<string, string>` | Route params (params.slug) |

### Usage

Loaded dynamically by the store catch-all route for `/blog/:slug`.
