# Newsletter Module — Store Components

Components exported for use in store MDX templates. Import via the component registry (auto-registered when the module is in `templates/brisa/config.json`).

## NewsletterForm

Email subscription form with optional name fields.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showName` | `boolean` | `false` | Show first/last name fields |
| `source` | `string` | — | Attribution source (e.g. `"footer-form"`) |
| `title` | `string` | `"Subscribe to our newsletter"` | Form heading |
| `description` | `string` | `"Get the latest updates..."` | Form description |
| `compact` | `boolean` | `false` | Compact inline layout |

### Usage in MDX

```mdx
<NewsletterForm />

<NewsletterForm
  showName={true}
  source="footer"
  title="Stay in the loop"
  compact={true}
/>
```

## NewsletterInline

Inline newsletter signup for use in blog posts or product pages.

### Props

Same as `NewsletterForm`. Use `compact={true}` for inline placement.

### Usage in MDX

```mdx
<NewsletterInline compact={true} source="product-page" />
```
