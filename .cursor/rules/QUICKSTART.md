# Module System Quick Start

## 🎉 Implementation Complete!

The better-auth inspired module plugin system is fully implemented and ready to use.

## What You Got

✅ **Cart Module** - Complete reference implementation with 8 endpoints  
✅ **Type-Safe API Client** - Auto-generated with full TypeScript support  
✅ **Security Model** - Admin routes protected by auth middleware  
✅ **Documentation** - Complete API docs and examples  

## Try It Now

### 1. Start the Store

```bash
cd /Volumes/19174972296/Vibe/86d
pnpm dev:store
```

### 2. Test Customer Endpoints

```bash
# Get cart (creates if doesn't exist)
curl http://localhost:3000/api/cart/get

# Add item to cart
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_123",
    "quantity": 2,
    "price": 29.99
  }'

# Get cart again (should have 1 item)
curl http://localhost:3000/api/cart/get
```

### 3. Test Admin Endpoints

```bash
# List all carts (returns 401 without auth - as expected!)
curl http://localhost:3000/api/admin/carts

# This is GOOD - means admin protection is working!
```

## Using the Type-Safe Client

In your React components:

```typescript
// apps/store/app/some-page/page.tsx
import { api } from "../../generated/client";

export default async function CartPage() {
  // Fully typed!
  const cart = await api("/cart/get", {
    method: "GET"
  });

  return (
    <div>
      <h1>Your Cart</h1>
      <p>Items: {cart.itemCount}</p>
      <p>Subtotal: ${cart.subtotal}</p>
    </div>
  );
}
```

## Create Your Own Module

### 1. Create Module Directory

```bash
mkdir -p modules/wishlist/src/store/endpoints
mkdir -p modules/wishlist/src/admin/endpoints
```

### 2. Copy Cart Module Structure

```bash
# Use cart as template
cp modules/cart/package.json modules/wishlist/
cp modules/cart/tsconfig.json modules/wishlist/
```

### 3. Create Module Factory

```typescript
// modules/wishlist/src/index.ts
import type { Module } from "@86d-app/core/types/module";

export default function wishlist(options?: WishlistOptions): Module {
  return {
    id: "wishlist",
    endpoints: {
      store: {
        "/wishlist": addToWishlist,
        "/wishlist/get": getWishlist,
      },
      admin: {
        "/admin/wishlists": listWishlists,
      },
    },
    adapter: defaultWishlistAdapter,
  };
}
```

### 4. Enable Module

```json
// template/config.json
{
  "modules": [
    "@86d-app/cart",
    "@86d-app/wishlist"
  ]
}
```

### 5. Generate

```bash
pnpm generate:modules
```

## Files Generated

After running `pnpm generate:modules`:

```
apps/store/generated/
├── api-router.ts    # Unified router with all endpoints
├── client.ts        # Type-safe API client
└── modules.ts       # MDX components (if any)
```

## API Endpoints Available

### Customer Endpoints (No Auth Required)
- `POST /api/cart` - Add item
- `GET /api/cart/get` - Get cart
- `PATCH /api/cart/items/:id/update` - Update item
- `DELETE /api/cart/items/:id/remove` - Remove item  
- `DELETE /api/cart/clear` - Clear cart

### Admin Endpoints (Auth Required)
- `GET /api/admin/carts` - List all carts
- `GET /api/admin/carts/:id` - Get cart details
- `DELETE /api/admin/carts/:id/delete` - Delete cart

## Next Steps

### 1. Add Authentication

Update `apps/store/app/api/[...path]/route.ts`:

```typescript
async function getSession(req: NextRequest) {
  // Replace with actual better-auth session lookup
  const session = await auth.api.getSession({ 
    headers: req.headers 
  });
  
  return {
    customerId: session?.user?.id,
    isAdmin: session?.user?.role === "admin",
  };
}
```

### 2. Add Prisma Adapter

```typescript
// modules/cart/src/adapter-prisma.ts
import { PrismaClient } from "@prisma/client";

export function createPrismaCartAdapter(db: PrismaClient): CartAdapter {
  return {
    cart: {
      async getOrCreate(params) {
        return db.cart.upsert({
          where: { 
            customerId: params.customerId 
          },
          create: params,
          update: {},
        });
      },
      // ... implement other methods
    },
  };
}
```

### 3. Create More Modules

Use the cart module as a template:
- **Products** - Product catalog
- **Orders** - Order management
- **Reviews** - Product reviews
- **Wishlist** - User wishlists

## Documentation

- 📖 **[MODULES_API.md](MODULES_API.md)** - Complete API documentation
- 📖 **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What was built
- 📖 **[MODULES.md](MODULES.md)** - Original module system docs

## Troubleshooting

### Module not found error

```bash
# Regenerate modules
pnpm generate:modules

# Install dependencies
pnpm install
```

### TypeScript errors

```bash
# Check for errors
pnpm --filter=@86d-app/cart typecheck

# Build
pnpm --filter=@86d-app/cart build
```

### 401 on admin endpoints

This is correct! Admin endpoints are protected. You need to:
1. Implement authentication in route handler
2. Set `isAdmin: true` in session

## Example: Full Flow

```typescript
// 1. Import client
import { api } from "../generated/client";

// 2. Add to cart
const result = await api("/cart", {
  method: "POST",
  body: {
    productId: "prod_abc",
    quantity: 1,
    price: 49.99,
  },
});

// 3. Get cart
const cart = await api("/cart/get", {
  method: "GET",
});

// 4. Update item
await api(`/cart/items/${cart.items[0].id}/update`, {
  method: "PATCH",
  body: { quantity: 2 },
});

// 5. Admin list carts (needs auth!)
const allCarts = await api("/admin/carts", {
  method: "GET",
});
```

## Success! 🎉

You now have a fully functional module system that:
- ✅ Is type-safe end-to-end
- ✅ Follows better-auth patterns
- ✅ Has built-in security
- ✅ Auto-generates clients
- ✅ Is easy to extend

Happy coding! 🚀
