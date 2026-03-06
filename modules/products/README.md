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

# Products Module

Product catalog module with variants and hierarchical categories. Full CRUD for the admin panel and read-only browsing with search and filtering for the storefront.

## Installation

```sh
npm install @86d-app/products
```

## Usage

```ts
import products from "@86d-app/products";

const module = products({
  defaultPageSize: 20,
  maxPageSize: 100,
  trackInventory: true,
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultPageSize` | `number` | `20` | Default number of products per page |
| `maxPageSize` | `number` | `100` | Maximum products per page |
| `trackInventory` | `boolean` | `true` | Enable inventory tracking by default |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/products` | List active products (paginated, filterable) |
| `GET` | `/products/featured` | Get featured products |
| `GET` | `/products/:slug` | Get a single product by slug (includes variants) |
| `GET` | `/products/search?q=` | Search products by name, description, or SKU |
| `GET` | `/categories` | List visible categories |
| `GET` | `/categories/:slug` | Get a single category by slug |

Query parameters for `GET /products`:

| Param | Type | Description |
|---|---|---|
| `page` | `number` | Page number (default `1`) |
| `limit` | `number` | Items per page (capped at `maxPageSize`) |
| `category` | `string` | Filter by category slug |
| `status` | `string` | Product status (storefront always uses `active`) |
| `featured` | `boolean` | Filter featured products |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/products` | Create a new product |
| `GET` | `/admin/products/list` | List all products (all statuses) |
| `GET` | `/admin/products/:id` | Get a product by ID |
| `PUT` | `/admin/products/:id` | Update a product |
| `DELETE` | `/admin/products/:id` | Delete a product |
| `POST` | `/admin/products/:productId/variants` | Add a variant to a product |
| `PUT` | `/admin/variants/:id` | Update a variant |
| `DELETE` | `/admin/variants/:id` | Delete a variant |
| `POST` | `/admin/categories` | Create a category |
| `GET` | `/admin/categories/list` | List all categories |
| `PUT` | `/admin/categories/:id` | Update a category |
| `DELETE` | `/admin/categories/:id` | Delete a category |

## Controller API

Controllers are accessed via the runtime context. Three sub-controllers are available: `product`, `variant`, and `category`.

```ts
// product controller
context.controllers.product.getById(ctx)        // Product | null
context.controllers.product.getBySlug(ctx)       // Product | null
context.controllers.product.getWithVariants(ctx) // ProductWithVariants | null
context.controllers.product.list(ctx)            // { products: Product[]; total: number }
context.controllers.product.create(ctx)          // Product
context.controllers.product.update(ctx)          // Product | null
context.controllers.product.delete(ctx)          // void

// variant controller
context.controllers.variant.create(ctx)          // ProductVariant
context.controllers.variant.update(ctx)          // ProductVariant | null
context.controllers.variant.delete(ctx)          // void

// category controller
context.controllers.category.getById(ctx)        // Category | null
context.controllers.category.getBySlug(ctx)      // Category | null
context.controllers.category.list(ctx)           // { categories: Category[]; total: number }
context.controllers.category.getTree(ctx)        // Category[]  (hierarchical)
context.controllers.category.create(ctx)         // Category
context.controllers.category.update(ctx)         // Category | null
context.controllers.category.delete(ctx)         // void
```

Each controller method receives a `ctx` object:

```ts
{
  context: { data: ModuleDataService };
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
}
```

## Types

```ts
interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;               // in cents
  compareAtPrice?: number;
  costPrice?: number;
  sku?: string;
  barcode?: string;
  inventory: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  status: "draft" | "active" | "archived";
  categoryId?: string;
  images: string[];
  tags: string[];
  isFeatured: boolean;
  weight?: number;
  weightUnit?: "kg" | "lb" | "oz" | "g";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  inventory: number;
  options: Record<string, string>; // e.g. { size: "M", color: "Blue" }
  images: string[];
  position: number;
  weight?: number;
  weightUnit?: "kg" | "lb" | "oz" | "g";
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;           // Self-referential for nested categories
  image?: string;
  position: number;
  isVisible: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductWithVariants extends Product {
  variants: ProductVariant[];
  category?: Category;
}
```

## Notes

- Store endpoints return only `active` products; admin endpoints return all statuses (`draft`, `active`, `archived`).
- Product IDs are prefixed: `prod_${timestamp}`. Variant IDs: `var_${timestamp}`.
- Deleting a category orphans its child categories and products (sets `categoryId` to `null`) rather than cascading.
- `getTree()` builds a hierarchical category tree from the flat list using `parentId` references.
