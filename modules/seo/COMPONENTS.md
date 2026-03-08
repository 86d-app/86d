# SEO Module — Store Components

Components exported for use in store MDX templates.

## SeoHead

Injects SEO meta tags into the page head. Fetches configured meta data for the given path and renders `<title>`, `<meta>` (description, robots, OpenGraph, Twitter Card), `<link rel="canonical">`, and JSON-LD structured data.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | Yes | Page path to fetch meta tags for |
| `fallbackTitle` | `string` | No | Title used if none configured for the path |
| `fallbackDescription` | `string` | No | Description used if none configured |

### Usage in MDX

```mdx
<SeoHead path="/products" fallbackTitle="All Products" />
<SeoHead path="/about" fallbackTitle="About Us" fallbackDescription="Learn more about our store." />
```

Place in page layouts or individual pages to enable per-page SEO control from the admin.

## SitemapPage

Human-readable sitemap listing all indexable pages. Shows page names as links with optional last-modified dates.

### Props

None. The component fetches sitemap entries automatically.

### Usage in MDX

```mdx
<SitemapPage />
```

Use on a `/sitemap` page to provide a browsable index of all store pages.
