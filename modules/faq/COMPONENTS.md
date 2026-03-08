# FAQ Module — Store Components

Components exported for use in store MDX templates.

## FaqAccordion

Collapsible accordion of FAQ items. When given a `categorySlug`, displays items from that category. Otherwise shows a category navigation bar. Includes helpfulness voting on each expanded item.

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `categorySlug` | `string?` | — | Slug of category to display. If omitted, shows category list. |
| `title` | `string?` | `"FAQ"` | Section heading (used when no category is loaded) |

### Usage in MDX

```mdx
{/* Show all categories as navigation */}
<FaqAccordion />

{/* Show items from a specific category */}
<FaqAccordion categorySlug="shipping" title="Shipping FAQ" />
```

Typically placed on a dedicated `/faq` page or embedded in relevant product/category pages. Each item expands to show the answer and a "Was this helpful?" voting widget.

## FaqSearch

Live search widget with debounced input and result display. Searches across all visible FAQ items by question text, answer text, and tags.

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string?` | `"Search frequently asked questions..."` | Input placeholder text |

### Usage in MDX

```mdx
<FaqSearch />

<FaqSearch placeholder="How can we help?" />
```

Place at the top of the FAQ page for instant search. Results link to individual FAQ item pages at `/faq/item/:slug`. Input is debounced (300ms) to avoid excessive API calls.
