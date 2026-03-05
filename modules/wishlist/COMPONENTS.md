# Wishlist Module — Store Components

Components exported for use in store MDX templates. Import via the component registry (auto-registered when the module is in `templates/brisa/config.json`).

## WishlistButton

Toggle button for adding/removing a product from the customer's wishlist. Fetches its own data to check current wishlist status.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `productId` | `string` | — | Product ID (required) |
| `productName` | `string` | — | Product name for the wishlist entry (required) |
| `productImage` | `string` | — | Product image URL |
| `customerId` | `string` | — | Customer ID. If omitted, the button appears disabled |

### Usage in MDX

```mdx
<WishlistButton productId={product.id} productName={product.name} />

<WishlistButton
  productId={product.id}
  productName={product.name}
  productImage={product.images[0]}
  customerId={customerId}
/>
```

Typically placed on product cards or product detail pages alongside the "Add to Cart" button.

## WishlistPage

Full wishlist page displaying all saved items with remove functionality. Fetches its own data.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customerId` | `string` | — | Customer ID. Shows sign-in prompt if omitted |

### Usage in MDX

```mdx
<WishlistPage customerId={customerId} />
```

Typically placed on a dedicated `/wishlist` page in the store template.

## HeartIcon

Simple heart icon with filled/unfilled states. Used internally by WishlistButton.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filled` | `boolean` | — | Whether the heart is filled (required) |
| `large` | `boolean` | `false` | Use larger size |

### Usage in MDX

```mdx
<HeartIcon filled={false} />

<HeartIcon filled={true} large={true} />
```
