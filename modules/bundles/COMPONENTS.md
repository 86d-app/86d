# Bundles Module — Store Components

Components exported for use in store MDX templates.

## BundleDetail

Fetches and displays a single product bundle by its slug, including bundle items and discount information.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `slug` | `string` | Yes | URL slug of the bundle to display |

### Usage in MDX

```mdx
<BundleDetail slug="starter-kit" />
```

Use this component on a dedicated bundle detail page to show a single bundle with its products and pricing.

## BundleList

Fetches and displays all available product bundles with their discount information.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<BundleList />
```

Use this component on a bundles landing page or promotional section to showcase all active bundles.
