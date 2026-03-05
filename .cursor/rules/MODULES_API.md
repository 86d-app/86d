# Module API System

A better-auth inspired module system for creating type-safe, modular API endpoints using better-call.

## Overview

The module system allows you to create self-contained modules that can define:
- **Customer-facing endpoints** (store)
- **Admin endpoints** (with `/admin` prefix)
- **Database schemas**
- **Adapters** for data persistence
- **Type-safe clients**

All modules are configured in `templates/brisa/config.json` and automatically generate:
- Unified API router at `apps/store/generated/api-router.ts`
- Type-safe client at `apps/store/generated/client.ts`
- MDX component registry at `apps/store/generated/modules.ts`

## Architecture

### Single Deployment Model

Unlike the initial plan, **admin routes are part of the store app** at `/admin/*` prefix:

```
Store App (apps/store)
├─ /api/cart              (customer endpoint)
├─ /api/cart/items/:id    (customer endpoint)
├─ /api/admin/carts       (admin endpoint - auth required)
└─ /api/admin/carts/:id   (admin endpoint - auth required)
```

**Benefits:**
- ✅ Single deployment with unified context
- ✅ Built-in security via auth middleware
- ✅ Simpler for open-source modules
- ✅ Shared adapters and configuration

## Quick Start

### 1. Create a Module

```typescript
// modules/wishlist/src/index.ts
import type { Module } from "@86d-app/core/types/module";
import { createEndpoint } from "better-call";
import { z } from "zod";

// Define endpoints
const addToWishlist = createEndpoint(
  "/wishlist",
  {
    method: "POST",
    body: z.object({
      productId: z.string(),
    }),
  },
  async (ctx) => {
    const { body, context } = ctx;
    // Implementation using context.adapter.wishlist
    return { success: true };
  }
);

// Export module factory as default
export default function wishlist(options?: WishlistOptions): Module {
  return {
    id: "wishlist",
    endpoints: {
      store: {
        "/wishlist": addToWishlist,
      },
      admin: {
        "/admin/wishlists": listWishlists,
      },
    },
    adapter: defaultWishlistAdapter,
  };
}
```

### 2. Enable Module

Add to `templates/brisa/config.json`:

```json
{
  "modules": [
    "@86d-app/cart",
    "@86d-app/wishlist"
  ],
  "moduleOptions": {
    "@86d-app/wishlist": {
      "maxItems": 50
    }
  }
}
```

### 3. Generate Routes

```bash
pnpm generate:modules
```

This generates:
- `apps/store/generated/api-router.ts` - Unified router
- `apps/store/generated/client.ts` - Type-safe client
- `apps/store/generated/modules.ts` - MDX components

### 4. Use Client

```typescript
import { api } from "../generated/client";

// Customer endpoint
const result = await api("/wishlist", {
  method: "POST",
  body: { productId: "123" }
});

// Admin endpoint (requires auth)
const wishlists = await api("/admin/wishlists", {
  method: "GET"
});
```

## Module Structure

### Required Files

```
modules/[module-name]/
├── package.json          # Module package
├── src/
│   ├── index.ts         # Default export: module factory
│   ├── adapter.ts       # Adapter interface & implementation
│   ├── schema.ts        # Database schema definition
│   └── endpoints/
│       ├── store/       # Customer endpoints
│       └── admin/       # Admin endpoints (with /admin prefix)
└── tsconfig.json
```

### Module Factory Pattern

```typescript
export default function moduleName(options?: ModuleOptions): Module {
  return {
    id: "module-name",
    schema: moduleSchema,
    endpoints: {
      store: {
        // Customer endpoints at /api/*
        "/resource": endpoint,
      },
      admin: {
        // Admin endpoints at /api/admin/*
        "/admin/resources": adminEndpoint,
      },
    },
    adapter: defaultAdapter,
    options,
  };
}
```

## Creating Endpoints

### Customer Endpoint

```typescript
// modules/cart/src/store/endpoints/add-to-cart.ts
import { createEndpoint } from "better-call";
import { z } from "zod";
import type { ModuleContext } from "@86d-app/core/types/context";

export const addToCart = createEndpoint(
  "/cart",
  {
    method: "POST",
    body: z.object({
      productId: z.string(),
      quantity: z.number().positive(),
      price: z.number().positive(),
    }),
  },
  async (ctx) => {
    const { body } = ctx;
    const context = ctx.context as ModuleContext;
    
    // Access adapter
    const cartAdapter = context.adapter.cart;
    
    // Get or create cart
    const cart = await cartAdapter.cart.getOrCreate({
      customerId: context.session?.customerId,
      guestId: context.session?.guestId,
    });
    
    // Add item
    const item = await cartAdapter.cart.addItem({
      cartId: cart.id,
      productId: body.productId,
      quantity: body.quantity,
      price: body.price,
    });
    
    return { cart, item };
  }
);
```

### Admin Endpoint

```typescript
// modules/cart/src/admin/endpoints/list-carts.ts
export const listCarts = createEndpoint(
  "/admin/carts",  // Note: /admin prefix
  {
    method: "GET",
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
    }).optional(),
  },
  async (ctx) => {
    const { query = {} } = ctx;
    const context = ctx.context as ModuleContext;
    
    // This endpoint is automatically protected by auth middleware
    const cartAdapter = context.adapter.cart;
    
    return await cartAdapter.cart.list({
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }
);
```

## Creating Adapters

### Interface Definition

```typescript
// modules/cart/src/adapter.ts
import type { BaseAdapter } from "@86d-app/core/adapter";

export interface CartAdapter extends BaseAdapter {
  cart: {
    getOrCreate(params: GetOrCreateParams): Promise<Cart>;
    addItem(params: AddItemParams): Promise<CartItem>;
    // ... more operations
  };
}
```

### In-Memory Implementation

```typescript
export function createInMemoryCartAdapter(): CartAdapter {
  const carts = new Map<string, Cart>();
  const items = new Map<string, CartItem>();
  
  return {
    cart: {
      async getOrCreate(params) {
        // Find or create cart
        let cart = findExistingCart(params);
        if (!cart) {
          cart = createNewCart(params);
          carts.set(cart.id, cart);
        }
        return cart;
      },
      
      async addItem(params) {
        const item = createCartItem(params);
        items.set(item.id, item);
        return item;
      },
    },
  };
}

export const defaultCartAdapter = createInMemoryCartAdapter();
```

## Security Model

### Three-Layer Security

1. **Installation Control**
   - Modules must be explicitly installed via `npm install`
   - All code is in your repository and can be audited

2. **Configuration Control**
   - Modules must be enabled in `templates/brisa/config.json`
   - You control which modules are loaded

3. **Runtime Protection**
   - Admin endpoints (starting with `/admin`) automatically protected
   - Auth middleware checks session and admin role
   - Enforced at route handler level, not by module

### Example: Security in Action

```typescript
// Even if a malicious module defines this:
export default function maliciousModule() {
  return {
    endpoints: {
      admin: {
        "/admin/delete-everything": dangerousEndpoint
      }
    }
  };
}

// The endpoint is STILL protected because:
// 1. Must be installed (npm install)
// 2. Must be enabled in config.json
// 3. Route handler checks auth before executing
```

## Generated Files

### API Router

```typescript
// apps/store/generated/api-router.ts (auto-generated)
import { createRouter } from "better-call";
import module0 from "@86d-app/cart";

const modules = [
  module0(moduleOptions["@86d-app/cart"] || {}),
];

const allEndpoints = modules.reduce((acc, module) => {
  if (module.endpoints?.store) {
    Object.assign(acc, module.endpoints.store);
  }
  if (module.endpoints?.admin) {
    Object.assign(acc, module.endpoints.admin);
  }
  return acc;
}, {});

export const router = createRouter(allEndpoints);
export type Router = typeof router;
```

### Type-Safe Client

```typescript
// apps/store/generated/client.ts (auto-generated)
import { createClient } from "better-call/client";
import { getBaseUrl } from "utils/url";
import type { Router } from "./api-router";

export const api = createClient<Router>({
  baseURL: getBaseUrl(),
});
```

## Route Handler

The route handler at `apps/store/app/api/[...path]/route.ts` handles all requests:

```typescript
async function handleRequest(req: NextRequest, { params }) {
  const fullPath = `/${params.path.join("/")}`;
  
  // Check if this is an admin route
  if (fullPath.startsWith("/admin")) {
    const session = await getSession(req);
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  
  // Create context
  const context = createModuleContext({
    db,
    modules: [],
    session: await getSession(req),
  });
  
  // Execute router
  return router.handler(req, { context });
}
```

## Module Context

Endpoints receive a `ModuleContext` with:

```typescript
export type ModuleContext = {
  adapter: Record<string, any>;     // All module adapters
  options: Record<string, any>;      // Module options from config
  modules: string[];                 // Enabled module IDs
  db: PrismaClient;                  // Database client
  session?: {                        // Session info (if authenticated)
    customerId?: string;
    guestId?: string;
    isAdmin?: boolean;
  };
};
```

## Examples

### Example: Cart Module (Included)

The cart module demonstrates the complete pattern:

**Customer Endpoints:**
- `POST /api/cart` - Add item to cart
- `GET /api/cart` - Get current cart
- `PATCH /api/cart/items/:id` - Update item
- `DELETE /api/cart/items/:id` - Remove item
- `DELETE /api/cart` - Clear cart

**Admin Endpoints:**
- `GET /api/admin/carts` - List all carts (paginated)
- `GET /api/admin/carts/:id` - Get cart details
- `DELETE /api/admin/carts/:id` - Delete cart

### Using the Cart API

```typescript
import { api } from "../generated/client";

// Add to cart (customer)
const result = await api("/cart", {
  method: "POST",
  body: {
    productId: "prod_123",
    quantity: 2,
    price: 29.99,
  },
});

// Get cart (customer)
const cart = await api("/cart", {
  method: "GET",
});

// List all carts (admin)
const carts = await api("/admin/carts", {
  method: "GET",
  query: {
    page: "1",
    limit: "20",
  },
});
```

## Best Practices

1. **Use Default Exports**: Export module factory as default for simpler imports
2. **Prefix Admin Endpoints**: Always start admin endpoints with `/admin`
3. **Type Your Context**: Cast `ctx.context as ModuleContext` for better types
4. **Validate Input**: Use Zod schemas for all endpoint inputs
5. **Implement Adapters**: Start with in-memory, migrate to Prisma later
6. **Document Options**: Provide TypeScript interface for module options
7. **Error Handling**: Throw descriptive errors that will be caught by route handler

## Migration to Prisma

When ready to move from in-memory to database:

1. **Create Prisma adapter implementation**:
```typescript
export function createPrismaCartAdapter(db: PrismaClient): CartAdapter {
  return {
    cart: {
      async getOrCreate(params) {
        return db.cart.upsert({
          where: { customerId: params.customerId },
          create: { ...params },
          update: {},
        });
      },
    },
  };
}
```

2. **Update module to use Prisma adapter**:
```typescript
export default function cart(options?: CartOptions): Module {
  return {
    adapter: createPrismaCartAdapter(db), // Use Prisma instead
  };
}
```

## Troubleshooting

### Module not found
- Ensure module is in `templates/brisa/config.json`
- Run `pnpm generate:modules`
- Check module is installed (`pnpm install`)

### TypeScript errors
- Run `pnpm typecheck` to see all errors
- Ensure all imports use correct paths
- Check that better-call and zod are installed

### Admin endpoints not protected
- Verify endpoint path starts with `/admin`
- Check auth middleware is running in route handler
- Test with `isAdmin: false` in session

## Next Steps

1. ✅ Cart module implemented (reference implementation)
2. Create products module
3. Create orders module  
4. Create customers module
5. Implement Prisma adapters
6. Add webhook support
7. Add rate limiting

## Resources

- [Better-Call Documentation](https://www.npmjs.com/package/better-call)
- [Better-Auth Plugin Pattern](https://github.com/better-auth/better-auth)
- [Zod Validation](https://zod.dev)
