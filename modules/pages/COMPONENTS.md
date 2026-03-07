# Pages Module Components

## Store Components

### PageListing
Displays a list of published content pages with titles and excerpts. Links to individual page detail views.

**Props:**
- `limit` (number, optional) — Max pages to display. Default: 50.

### PageDetail
Renders a single content page by slug. Shows title, excerpt, featured image, and full content.

**Props:**
- `slug` (string, required) — Page slug to display.

## Admin Components

### PagesAdmin
Full admin interface for managing content pages. Includes:
- Paginated table with status, navigation flag, position, and last-updated columns
- Status filtering (draft/published/archived)
- Create/edit form with SEO metadata fields (meta title, meta description)
- Navigation toggle and position ordering
- Delete confirmation modal
