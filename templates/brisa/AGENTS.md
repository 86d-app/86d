# 86d Store Template Guide

How to build and customize store templates using MDX and module components.

## Overview

Store templates live in the `templates/brisa/` directory. The layout, homepage, and page content are defined in MDX files. Module components (Cart, ProductCard, NewsletterForm, etc.) are automatically available when their modules are listed in `templates/brisa/config.json`.

## Template Structure

```
templates/brisa/
  config.json       Theme, modules, OKLCH colors, logos
  layout.mdx        Global layout (Navbar, main, Footer)
  index.mdx         Homepage
  navbar.mdx        Navbar template
  footer.mdx        Footer template
  about.mdx         Static pages
  contact.mdx
  products/
    layout.mdx      Product listing wrapper
    [slug]/
      layout.mdx    Product detail wrapper
  collections/
    layout.mdx
  blog/
    layout.mdx
  global.css        Tailwind entry
```

## config.json

```json
{
  "theme": "brisa",
  "name": "86d Starter Kit",
  "modules": ["@86d-app/products", "@86d-app/cart", "@86d-app/newsletter", ...],
  "moduleOptions": { "@86d-app/cart": { "guestCartExpiration": 604800000 } },
  "variables": {
    "light": { "background": "oklch(...)", "foreground": "...", "primary": "..." },
    "dark": { ... }
  }
}
```

## Using Module Components

Module components are registered automatically. Use them by name in any MDX file:

```mdx
<Cart />
<CartButton />
<ProductGrid />
<ProductCard product={product} />
<NewsletterForm />
<NewsletterForm compact={true} source="footer" />
```

Each module documents its store components in the **Store Components** section of its `README.md`.

## Layout Pattern

The `.tsx` file holds business logic (state, data fetching); the `.mdx` file holds presentation. The layout receives `props.config` and `props.theme` from the app.

```mdx
<StoreNavbar
  config={props.config}
  navItems={[...]}
  actions={<CartButton />}
/>
<main>
  <Cart />
  {props.children}
</main>
<Footer logo={...} storeName={props.config.name} sections={[...]} />
```

## Adding a New Page

1. Create `templates/brisa/my-page.mdx` (or a directory with `layout.mdx`)
2. Add a route in the store app if needed (or use the catch-all for MDX routes)
3. Reference it from the navbar or footer in `layout.mdx`

## Theme Variables

OKLCH color tokens from `config.json` are available as CSS custom properties. Use `var(--background)`, `var(--foreground)`, `var(--primary)`, etc. in your Tailwind classes.
