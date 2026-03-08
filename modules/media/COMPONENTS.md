# Media Module — Store Components

Components exported for use in store MDX templates.

## MediaGallery

Filterable grid of media assets. Images render as thumbnails, videos show poster frames with a play overlay, and other file types display a label. Supports pagination and item selection.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `folder` | `string` | No | Filter by folder ID |
| `type` | `string` | No | Filter by type: `"image"`, `"video"`, or a MIME prefix |
| `tag` | `string` | No | Filter by tag |
| `pageSize` | `number` | No | Items per page (default: 12) |

### Usage in MDX

```mdx
<MediaGallery />
<MediaGallery type="image" pageSize={8} />
<MediaGallery folder="hero-banners" tag="featured" />
```

Use on gallery pages, lookbook sections, or anywhere a browsable media grid is needed.

## ImageDisplay

Displays a single image asset by ID. Fetches the asset, renders with proper alt text, and optionally shows a caption.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Asset ID to display |
| `className` | `string` | No | CSS class for the container |
| `showCaption` | `boolean` | No | Show asset name as caption (default: false) |

### Usage in MDX

```mdx
<ImageDisplay id="asset-123" />
<ImageDisplay id="asset-123" showCaption />
<ImageDisplay id="hero-banner" className="aspect-[21/9] w-full" />
```

Use for hero images, content blocks, or anywhere a single managed image is displayed.

## VideoPlayer

Embedded HTML5 video player. Fetches a video asset by ID and renders with native controls.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Asset ID of the video |
| `autoPlay` | `boolean` | No | Auto-play muted when visible (default: false) |
| `loop` | `boolean` | No | Loop playback (default: false) |
| `className` | `string` | No | CSS class for the container |

### Usage in MDX

```mdx
<VideoPlayer id="promo-video" />
<VideoPlayer id="product-demo" autoPlay loop />
<VideoPlayer id="tutorial" className="max-w-2xl mx-auto" />
```

Use for product demo videos, promotional content, or tutorial sections.
