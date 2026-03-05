# Cart Module — Store Components

Components exported for use in store MDX templates.

## Cart

Shopping cart drawer. Slides in from the right when opened. Displays cart items, subtotal, and checkout link.

### Props

None. The cart fetches its own data via the module client.

### Usage in MDX

```mdx
<Cart />
```

Typically placed in the main layout (e.g. `templates/brisa/layout.mdx`) so it's available on every page.

## CartButton

Button that opens the cart drawer. Shows a badge with item count when the cart has items.

### Props

None.

### Usage in MDX

```mdx
<CartButton />
```

Typically placed in the navbar actions area:

```mdx
<StoreNavbar actions={<CartButton />} ... />
```
