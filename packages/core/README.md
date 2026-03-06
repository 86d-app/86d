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

# Core

Core types and utilities for building modules in the 86d module system. This package provides everything module authors need to create publishable, type-safe modules.

## Installation

```bash
npm install @86d-app/core
# or
pnpm add @86d-app/core
```

## Features

- **Type-safe module definition** - Full TypeScript support for modules, endpoints, and controllers
- **Endpoint utilities** - Re-exports from `better-call` and `zod` for defining HTTP endpoints
- **Client API** - Auto-generated React Query hooks for consuming module endpoints
- **Module dependencies** - Declare required modules with the `requires` field

## Creating a Module

A module is a self-contained unit that provides endpoints, controllers, and optionally a database schema.

```typescript
import {
  createEndpoint,
  z,
  type Module,
  type ModuleContext,
  type ModuleService,
} from "@86d-app/core";

// Define your service interface
interface MyService extends ModuleService {
  id: "my-module";
  version: "1.0.0";
  getData(): Promise<string>;
}

// Create endpoints
const getItems = createEndpoint(
  "/items",
  { method: "GET" },
  async (ctx) => {
    const context = ctx.context as ModuleContext;
    return { items: [] };
  }
);

const createItem = createEndpoint(
  "/items",
  {
    method: "POST",
    body: z.object({
      name: z.string(),
      price: z.number().positive(),
    }),
  },
  async (ctx) => {
    const { body } = ctx;
    const context = ctx.context as ModuleContext;
    // Create item logic...
    return { id: "123", ...body };
  }
);

// Export module factory
export default function myModule(): Module {
  return {
    id: "my-module",

    // Declare dependencies (optional)
    requires: ["auth"],

    // Initialize module and register service
    init: async (ctx: ModuleContext) => {
      const service: MyService = {
        id: "my-module",
        version: "1.0.0",
        async getData() {
          return "Hello from my module!";
        },
      };
      return { service };
    },

    // Define endpoints
    endpoints: {
      store: {
        "/items": createItem,
        "/items/list": getItems,
      },
      admin: {
        // Admin endpoints here
      },
    },
  };
}
```

## Module Dependencies

Use the `requires` field to declare dependencies on other modules:

```typescript
export default function checkout(): Module {
  return {
    id: "checkout",
    requires: ["cart", "products"], // Must be initialized before this module

    init: async (ctx: ModuleContext) => {
      // Safe to access - runtime guarantees these exist
      const cartService = ctx.services.cart as CartService;
      const productsService = ctx.services.products as ProductsService;

      // No null checks needed!
      const cart = await cartService.getCart({ customerId: "..." });
    },
  };
}
```

The runtime will:
- Validate required modules are initialized before your module
- Throw a clear error if dependencies are missing
- Guarantee services from required modules exist

## Client API

The client package provides React Query integration for consuming module endpoints.

### Setup

```tsx
import { ModuleClientProvider } from "@86d-app/core/client";
import cart from "@my-org/cart";
import products from "@my-org/products";

function App({ children }) {
  return (
    <ModuleClientProvider
      baseURL="/api"
      modules={[cart(), products()]}
      headers={() => ({
        Authorization: `Bearer ${getToken()}`,
      })}
    >
      {children}
    </ModuleClientProvider>
  );
}
```

### Using Hooks

```tsx
import { useModuleClient } from "@86d-app/core/client";

function ProductList() {
  const client = useModuleClient();

  // GET endpoints become queries
  const { data, isLoading } = client
    .module("products")
    .store["/products"]
    .useQuery({ category: "electronics" });

  // POST/PUT/DELETE endpoints become mutations
  const addToCart = client.module("cart").store["/cart"].useMutation({
    onSuccess: () => {
      // Invalidate related queries
      client.module("cart").store["/cart/get"].invalidate();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {data?.products.map((product) => (
        <li key={product.id}>
          {product.name}
          <button
            onClick={() =>
              addToCart.mutate({
                productId: product.id,
                quantity: 1,
                price: product.price,
              })
            }
          >
            Add to Cart
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### Non-React Usage

```typescript
import { createModuleClient } from "@86d-app/core/client";
import cart from "@my-org/cart";

const client = createModuleClient([cart()], {
  baseURL: "https://api.example.com",
});

// Direct fetch (no React hooks)
const cartData = await client.module("cart").store["/cart/get"].fetch();
```

## API Reference

### Types

| Export | Description |
|--------|-------------|
| `Module` | Main module definition interface |
| `ModuleContext` | Runtime context passed to endpoints and init |
| `ModuleService` | Base interface for services exposed to other modules |
| `ModuleSchema` | Database schema definition type |
| `ModuleDataService` | Interface for scoped data access |
| `BaseAdapter` | Base interface for module adapters |

### Endpoint Utilities (re-exported from better-call)

| Export | Description |
|--------|-------------|
| `createEndpoint` | Create an HTTP endpoint |
| `createRouter` | Create a router from endpoints |
| `z` | Zod schema builder |
| `Endpoint` | Endpoint type |
| `EndpointContext` | Context passed to endpoint handlers |

### Client API

| Export | Description |
|--------|-------------|
| `ModuleClientProvider` | React provider component |
| `useModuleClient` | Hook to access the client |
| `createModuleClient` | Factory for non-React usage |
| `createQueryClient` | Create a QueryClient instance |
| `getQueryClient` | Get/create singleton QueryClient |

## Module Context

The `ModuleContext` provides access to:

```typescript
interface ModuleContext {
  storeId: string;              // Tenant ID
  data: ModuleDataService;      // Scoped data access
  adapter: Record<string, any>; // Module adapters
  services: Record<string, ModuleService>; // Other modules' services
  options: Record<string, any>; // Module configuration
  modules: string[];            // Enabled module IDs
  session?: {
    customerId?: string;
    guestId?: string;
    isAdmin?: boolean;
  };
}
```

## Best Practices

1. **Export service types** - Let other modules import your service interface
2. **Use `requires`** - Declare dependencies explicitly for better error messages
3. **Scope data access** - Always use `ctx.data` instead of direct DB access
4. **Version your services** - Include a version string for compatibility checks
5. **Keep modules focused** - Each module should have a single responsibility
