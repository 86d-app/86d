<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# Search Module

Unified search, autocomplete, and search analytics module for 86d commerce platform.

## Installation

```sh
npm install @86d-app/search
```

## Usage

```ts
import search from "@86d-app/search";

const module = search({
  maxResults: 100,
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `maxResults` | `number` | — | Maximum number of results per query |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/search?q=...&type=...&limit=...&skip=...` | Full-text search with optional entity type filtering |
| `GET` | `/search/suggest?prefix=...&limit=...` | Autocomplete suggestions |
| `GET` | `/search/recent?sessionId=...&limit=...` | Recent search queries by session |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/search/analytics` | Search analytics summary |
| `GET` | `/admin/search/popular` | Most popular search terms |
| `GET` | `/admin/search/zero-results` | Queries that returned zero results |
| `GET` | `/admin/search/synonyms` | List all synonym groups |
| `POST` | `/admin/search/synonyms/add` | Add a synonym group |
| `POST` | `/admin/search/synonyms/:id/delete` | Delete a synonym group |
| `POST` | `/admin/search/index` | Manually index an item |
| `POST` | `/admin/search/index/remove` | Remove an item from the index |

## Controller API

```ts
interface SearchController {
  indexItem(params: {
    entityType: string;
    entityId: string;
    title: string;
    body?: string;
    tags?: string[];
    url?: string;
    image?: string;
    metadata?: Record<string, unknown>;
  }): Promise<SearchIndexItem>;

  removeFromIndex(entityType: string, entityId: string): Promise<void>;

  search(query: string, options?: {
    entityType?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ results: SearchResult[]; total: number }>;

  suggest(prefix: string, limit?: number): Promise<string[]>;
  recordQuery(term: string, resultCount: number, sessionId?: string): Promise<void>;
  getRecentQueries(sessionId: string, limit?: number): Promise<SearchQuery[]>;
  getPopularTerms(limit?: number): Promise<PopularTerm[]>;
  getZeroResultQueries(limit?: number): Promise<SearchQuery[]>;
  getAnalytics(): Promise<SearchAnalyticsSummary>;
  addSynonym(term: string, synonyms: string[]): Promise<SearchSynonym>;
  removeSynonym(id: string): Promise<void>;
  listSynonyms(): Promise<SearchSynonym[]>;
  getIndexCount(): Promise<number>;
}
```

## Types

```ts
interface SearchIndexItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  body?: string;
  tags: string[];
  url?: string;
  image?: string;
  metadata?: Record<string, unknown>;
  indexedAt: Date;
}

interface SearchResult {
  item: SearchIndexItem;
  score: number;
}

interface SearchAnalyticsSummary {
  totalQueries: number;
  uniqueTerms: number;
  avgResultCount: number;
  zeroResultCount: number;
  zeroResultRate: number;
}

interface PopularTerm {
  term: string;
  count: number;
  avgResultCount: number;
}
```

## Store Components

### SearchBar

An autocomplete search input with keyboard navigation support. Fetches suggestions as the user types (minimum 2 characters) and triggers a search callback on submission. Includes a search icon and an accessible combobox dropdown.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `placeholder` | `string` | No | Placeholder text for the search input. Defaults to `"Search..."`. |
| `onSearch` | `(query: string) => void` | No | Callback fired when the user submits a search query (via Enter key or suggestion click). |

#### Usage in MDX

```mdx
<SearchBar placeholder="Search products..." onSearch={handleSearch} />
```

Best used in the site header or on a search page to provide instant search suggestions as customers type.

### SearchPage

A complete search experience combining SearchBar and SearchResults into a single page layout with a heading, search input, and results area. Manages the search query state internally.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `sessionId` | `string` | No | Optional session ID passed to SearchResults for analytics tracking. |

#### Usage in MDX

```mdx
<SearchPage />
```

Best used as the main content of a dedicated `/search` page in the storefront.

### SearchResults

Displays search results for a given query, with loading and empty states. Fetches results from the search module and renders them as linked cards with optional images.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | Yes | The search query string to execute. |
| `entityType` | `string` | No | Filter results to a specific entity type (e.g., `"product"`). |
| `sessionId` | `string` | No | Optional session ID for search analytics tracking. |
| `limit` | `number` | No | Maximum number of results to return. Defaults to `20`. |

#### Usage in MDX

```mdx
<SearchResults query="shoes" entityType="product" limit={10} />
```

Best used below a search bar to display results, or on a category page for filtered search results.
