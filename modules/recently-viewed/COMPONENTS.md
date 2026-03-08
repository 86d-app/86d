# Recently Viewed Module — Store Components

Components exported for use in store MDX templates. Auto-registered when the module is in `templates/brisa/config.json`.

## RecentlyViewedGrid

Full-width grid displaying recently viewed products with images, prices, and time-ago labels. Automatically hides when no views exist.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customerId` | `string` | — | Customer ID for authenticated users |
| `sessionId` | `string` | — | Session ID for anonymous users |
| `limit` | `number` | `12` | Maximum products to display |
| `title` | `string` | `"Recently Viewed"` | Section heading |
| `showClear` | `boolean` | `false` | Show "Clear all" button |

### Usage in MDX

```mdx
<RecentlyViewedGrid customerId={customerId} />

<RecentlyViewedGrid
  sessionId={sessionId}
  limit={8}
  title="You Recently Viewed"
  showClear
/>
```

Place on product detail pages (below the main product), the homepage, or cart page to encourage rediscovery.

## RecentlyViewedCompact

Compact horizontal scrolling strip of recently viewed products. Shows small thumbnails with names and prices. Hides when no views exist.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customerId` | `string` | — | Customer ID for authenticated users |
| `sessionId` | `string` | — | Session ID for anonymous users |
| `limit` | `number` | `6` | Maximum products to display |
| `title` | `string` | `"Recently Viewed"` | Section heading |

### Usage in MDX

```mdx
<RecentlyViewedCompact customerId={customerId} />

<RecentlyViewedCompact
  sessionId={sessionId}
  limit={4}
  title="Continue Browsing"
/>
```

Ideal for sidebars, footer sections, or anywhere space is limited.
