# Search Module — Store Components

Components exported for use in store MDX templates.

## SearchBar

An autocomplete search input with keyboard navigation support. Fetches suggestions as the user types (minimum 2 characters) and triggers a search callback on submission. Includes a search icon and an accessible combobox dropdown.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `placeholder` | `string` | No | Placeholder text for the search input. Defaults to `"Search..."`. |
| `onSearch` | `(query: string) => void` | No | Callback fired when the user submits a search query (via Enter key or suggestion click). |

### Usage in MDX

```mdx
<SearchBar placeholder="Search products..." onSearch={handleSearch} />
```

Best used in the site header or on a search page to provide instant search suggestions as customers type.

## SearchPage

A complete search experience combining SearchBar and SearchResults into a single page layout with a heading, search input, and results area. Manages the search query state internally.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | `string` | No | Optional session ID passed to SearchResults for analytics tracking. |

### Usage in MDX

```mdx
<SearchPage />
```

Best used as the main content of a dedicated `/search` page in the storefront.

## SearchResults

Displays search results for a given query, with loading and empty states. Fetches results from the search module and renders them as linked cards with optional images.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes | The search query string to execute. |
| `entityType` | `string` | No | Filter results to a specific entity type (e.g., `"product"`). |
| `sessionId` | `string` | No | Optional session ID for search analytics tracking. |
| `limit` | `number` | No | Maximum number of results to return. Defaults to `20`. |

### Usage in MDX

```mdx
<SearchResults query="shoes" entityType="product" limit={10} />
```

Best used below a search bar to display results, or on a category page for filtered search results.
