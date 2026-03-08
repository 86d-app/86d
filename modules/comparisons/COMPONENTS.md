# Comparisons Module — Store Components

Components exported for use in store MDX templates.

## ComparisonBar

Fixed bottom bar that shows products currently in the comparison list. Displays product thumbnails with remove buttons, a "Compare" link, and a "Clear" button.

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `customerId` | `string?` | — | Customer ID (for authenticated users) |
| `sessionId` | `string?` | — | Session ID (for guest users) |

### Usage in MDX

```mdx
<ComparisonBar sessionId={sessionId} />
```

Typically placed in the main layout so it appears on every page when the comparison list is non-empty. The bar auto-hides when the comparison list is empty.

## ComparisonTable

Full side-by-side product comparison table. Shows product images, prices, categories, and all attributes in a horizontally scrollable table with sticky row labels.

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `customerId` | `string?` | — | Customer ID (for authenticated users) |
| `sessionId` | `string?` | — | Session ID (for guest users) |
| `title` | `string?` | `"Compare Products"` | Section heading |

### Usage in MDX

```mdx
<ComparisonTable title="Compare Products" />
```

Typically placed on a dedicated `/compare` page. Shows an empty state message when no products are added. Each product column includes an image, name link, remove button, and all attribute rows.
