# Digital Downloads Module — Store Components

## MyDownloads

Lists downloadable files for a customer by email.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `email` | `string` | — | Customer email to fetch downloads for |
| `title` | `string` | `"My Downloads"` | Section heading |

### Usage in MDX

```mdx
<MyDownloads email={customerEmail} />
```

## DownloadButton

Single download button for a specific token (e.g. from order confirmation email).

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `token` | `string` | — | Download token |
| `label` | `string` | `"Download"` | Button label |

### Usage in MDX

```mdx
<DownloadButton token={downloadToken} />
```
