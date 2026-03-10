<p align="center">
  <a href="https://86d.app">
    <img src="https://86d.app/logo" height="96" alt="86d" />
  </a>
</p>

<p align="center">
  Dynamic Commerce
</p>

<p align="center">
  <a href="https://x.com/86d_app"><strong>X</strong></a> ·
  <a href="https://www.linkedin.com/company/86d"><strong>LinkedIn</strong></a>
</p>
<br/>

> [!WARNING]
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# Wishlist Module

Customer wishlist and favorites module for 86d commerce platform.

## Installation

```sh
npm install @86d-app/wishlist
```

## Usage

```ts
import wishlist from "@86d-app/wishlist";

const module = wishlist({
  maxItems: "50",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `maxItems` | `string` | — | Maximum number of items per customer wishlist |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/wishlist` | List current customer's wishlist items (paginated) |
| `POST` | `/wishlist/add` | Add an item to the wishlist |
| `DELETE` | `/wishlist/remove/:id` | Remove an item by ID |
| `GET` | `/wishlist/check/:productId` | Check if a product is in the wishlist |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/wishlist` | List all wishlist items (filterable by customer or product) |
| `GET` | `/admin/wishlist/summary` | Wishlist analytics (total items, top products) |
| `DELETE` | `/admin/wishlist/:id/delete` | Delete a wishlist item |

## Controller API

```ts
interface WishlistController {
  addItem(params: {
    customerId: string;
    productId: string;
    productName: string;
    productImage?: string;
    note?: string;
  }): Promise<WishlistItem>;

  removeItem(id: string): Promise<void>;
  removeByProduct(customerId: string, productId: string): Promise<void>;
  getItem(id: string): Promise<WishlistItem>;
  isInWishlist(customerId: string, productId: string): Promise<boolean>;
  listByCustomer(customerId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ items: WishlistItem[]; total: number }>;
  listAll(params?: {
    customerId?: string;
    productId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WishlistItem[]; total: number }>;
  countByCustomer(customerId: string): Promise<number>;
  getSummary(): Promise<WishlistSummary>;
}
```

## Types

```ts
interface WishlistItem {
  id: string;
  customerId: string;
  productId: string;
  productName: string;
  productImage?: string;
  note?: string;
  addedAt: Date;
}

interface WishlistSummary {
  totalItems: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    count: number;
  }>;
}
```

## Store Components

### WishlistButton

Toggle button for adding/removing a product from the customer's wishlist. Fetches its own data to check current wishlist status.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `productId` | `string` | — | Product ID (required) |
| `productName` | `string` | — | Product name for the wishlist entry (required) |
| `productImage` | `string` | — | Product image URL |
| `customerId` | `string` | — | Customer ID. If omitted, the button appears disabled |

#### Usage in MDX

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

### WishlistPage

Full wishlist page displaying all saved items with remove functionality. Fetches its own data.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `customerId` | `string` | — | Customer ID. Shows sign-in prompt if omitted |

#### Usage in MDX

```mdx
<WishlistPage customerId={customerId} />
```

Typically placed on a dedicated `/wishlist` page in the store template.

### HeartIcon

Simple heart icon with filled/unfilled states. Used internally by WishlistButton.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filled` | `boolean` | — | Whether the heart is filled (required) |
| `large` | `boolean` | `false` | Use larger size |

#### Usage in MDX

```mdx
<HeartIcon filled={false} />

<HeartIcon filled={true} large={true} />
```
