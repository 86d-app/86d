# Search Module

In-memory full-text search index with query analytics, synonym support, and autocomplete suggestions.

## Structure

```
src/
  index.ts          Factory: search(options?) => Module
  schema.ts         Data models: searchIndex, searchQuery, searchSynonym
  service.ts        SearchController interface + result/analytics types
  service-impl.ts   SearchController implementation (in-memory text matching)
  store/
    components/     Store-facing TSX (search bar, page, results)
    endpoints/
      store-search.ts    GET  /search/store-search (search integration)
      search.ts          GET  /search
      suggest.ts         GET  /search/suggest
      recent.ts          GET  /search/recent
  admin/
    components/     Admin TSX (analytics dashboard)
    endpoints/
      analytics.ts           GET    /admin/search/analytics
      popular.ts             GET    /admin/search/popular
      zero-results.ts        GET    /admin/search/zero-results
      synonyms.ts            GET    /admin/search/synonyms
                             POST   /admin/search/synonyms/add
                             DELETE /admin/search/synonyms/:id/delete
      index-manage.ts        POST   /admin/search/index
                             POST   /admin/search/index/remove
```

## Options

```ts
SearchOptions {
  maxResults?: number
}
```

## Data models

- **searchIndex**: id, entityType, entityId, title, body?, tags (json[]), url, image?, metadata (json), indexedAt
- **searchQuery**: id, term, normalizedTerm, resultCount, sessionId?, searchedAt
- **searchSynonym**: id, term, synonyms (json[]), createdAt

## Events

- Emits: `search.queried`, `search.indexed`, `search.removed`

## Patterns

- Registers `search: { store: "/search/store-search" }` for cross-module search integration
- Registers store page at `/search` (SearchPage component)
- `indexItem` uses composite key `${entityType}_${entityId}` for deduplication; re-indexing updates in-place
- Different entityTypes with same entityId are separate index entries
- `search()` normalizes query, tokenizes on whitespace/hyphen/punctuation, expands synonyms bidirectionally, scores against title/body/tags
- Scoring: exact title match (100) > title prefix (50) > title substring (25) > tag exact (30) > tag substring (15) > body match (10)
- `recordQuery()` logs each search for analytics (popular terms, zero-result tracking)
- `suggest(prefix)` returns autocomplete: popular terms with results first, then matching index titles, deduplicated
- Analytics: popular terms, zero-result queries, total/unique counts, avg result count
- Synonyms are bidirectional: if "tee" → ["t-shirt"], then searching "tee" or "t-shirt" finds both
