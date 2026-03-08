# Navigation Module — Store Components

Components exported for use in store MDX templates.

## NavFooter

Fetches and renders a footer navigation menu organized into columns, with each top-level item as a column heading and its children as links beneath.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `location` | `string` | No | Menu location identifier to fetch (defaults to `"footer"`) |

### Usage in MDX

```mdx
<NavFooter />
```

Use this component in a site footer layout to render the store's footer navigation links.

## NavMenu

Fetches and renders a horizontal navigation menu with support for nested dropdown children, suitable for desktop site headers.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `location` | `string` | No | Menu location identifier to fetch (defaults to `"header"`) |

### Usage in MDX

```mdx
<NavMenu />
```

Use this component in a site header to render the store's primary desktop navigation.

## NavMobileMenu

Fetches and renders a mobile-friendly navigation menu with hamburger toggle, expandable/collapsible sections, and overlay support.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `location` | `string` | No | Menu location identifier to fetch (defaults to `"mobile"`) |

### Usage in MDX

```mdx
<NavMobileMenu />
```

Use this component in a mobile site header to provide a responsive hamburger navigation menu.
