# Blog Module

Content management for blog posts with drafts, publishing workflow, and markdown rendering for store pages.

## Structure

```
src/
  index.ts          Factory: blog(options?) => Module
  schema.ts         Data model: post
  service.ts        BlogController interface
  service-impl.ts   BlogController implementation
  markdown.ts       toMarkdown converters for store pages (listing + detail)
  store/
    components/     Store-facing MDX + TSX (blog list, post detail)
    endpoints/
      list-posts.ts    GET /blog
      get-post.ts      GET /blog/:slug
  admin/
    components/     Admin MDX + TSX (blog admin)
    endpoints/
      list-posts.ts    GET    /admin/blog
      create-post.ts   POST   /admin/blog/create
      get-post.ts      GET    /admin/blog/:id
      update-post.ts   PUT    /admin/blog/:id/update
      delete-post.ts   DELETE /admin/blog/:id/delete
```

## Options

```ts
BlogOptions {
  postsPerPage?: string  // default "20"
}
```

## Data model

- **post**: id, title, slug (unique), content, excerpt?, coverImage?, author?, status (draft|published|archived), tags (json[]), category?, publishedAt?, createdAt, updatedAt

## Events

- Emits: `blog.published`, `blog.unpublished`, `blog.deleted`

## Patterns

- Registers store pages: `/blog` (BlogList) and `/blog/:slug` (BlogPostDetail) with `toMarkdown` converters
- `toMarkdownBlogListing` renders all published posts as a markdown page with titles, authors, dates, excerpts
- `toMarkdownBlogPost` renders a single published post as full markdown with metadata
- `publishPost(id)` sets status to "published" and records `publishedAt` timestamp
- `unpublishPost(id)` reverts status to "draft"
- `archivePost(id)` sets status to "archived"
- Store endpoints only serve posts with status "published"
- Posts are looked up by `slug` on the store side, by `id` on the admin side
