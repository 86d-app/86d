# FAQ Module

Self-service knowledge base with categorized questions, full-text search, and helpfulness voting.

## Structure

```
src/
  index.ts          Factory: faq(options?) => Module + admin nav registration
  schema.ts         Data models: faqCategory, faqItem
  service.ts        FaqController interface
  service-impl.ts   FaqController implementation
  mdx.d.ts          MDX module type declaration
  store/
    endpoints/      Customer-facing
      list-categories.ts     GET  /faq/categories
      get-category.ts        GET  /faq/categories/:slug
      get-item.ts            GET  /faq/items/:slug
      search.ts              GET  /faq/search?q=...
      vote.ts                POST /faq/items/:id/vote
    components/     Customer-facing MDX components
      index.tsx     FaqAccordion, FaqSearch
      faq-accordion.tsx/.mdx  Collapsible Q&A list
      faq-search.tsx/.mdx     Live search widget
      _hooks.ts     useFaqApi() hook
      _utils.ts     Error extraction helper
  admin/
    endpoints/      Protected (renders in store admin /admin/)
      list-categories.ts     GET    /admin/faq/categories
      create-category.ts     POST   /admin/faq/categories/create
      update-category.ts     PUT    /admin/faq/categories/:id
      delete-category.ts     DELETE /admin/faq/categories/:id/delete
      list-items.ts          GET    /admin/faq/items
      create-item.ts         POST   /admin/faq/items/create
      get-item.ts            GET    /admin/faq/items/:id
      update-item.ts         PUT    /admin/faq/items/:id
      delete-item.ts         DELETE /admin/faq/items/:id/delete
      stats.ts               GET    /admin/faq/stats
  __tests__/
    service-impl.test.ts   39 tests covering all controller methods
```

## Options

```ts
FaqOptions {
  maxSearchResults?: number  // default 20
}
```

## Data models

- **faqCategory**: id, name, slug (unique), description?, icon?, position, isVisible, metadata
- **faqItem**: id, categoryId (FK cascade), question, answer, slug (unique), position, isVisible, tags[], helpfulCount, notHelpfulCount, metadata

## Key patterns

- Categories and items are ordered by `position` field (ascending)
- Slug-based lookups for SEO-friendly URLs
- Search scores: question match (10) > tag match (8) > answer match (5), plus word-level bonuses
- Helpfulness voting is anonymous and cumulative
- `deleteCategory` cascades to all items in that category
- Store endpoints filter to `isVisible: true` only; admin endpoints show all
- `exactOptionalPropertyTypes` is on — all optional params use `| undefined`
