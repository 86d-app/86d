# Core

Module system foundation for 86d. Defines how modules declare endpoints, adapters, controllers, and client hooks.

## Structure

```
src/
  index.ts          Main exports (adapters, routers, types)
  api.ts            Endpoint creation via better-call
  adapters.ts       Adapter pattern definitions
  client/
    index.ts        Auto-generated React hooks from module endpoints
  types/
    helper.ts       Utility types
    module.ts       Module interface, ModuleContext, ModuleDataService
    schema.ts       ModuleSchema type (Zod-based model definitions)
  prisma/           Database access helpers
```

## Key exports

- `createRouter`, `createStoreEndpoint`, `createAdminEndpoint` — define module HTTP endpoints
- `Module` interface — the contract every module implements
- `ModuleContext` — runtime context passed to module init
- `ModuleDataService` — universal data access (get, findMany, upsert, delete)
- Client hooks auto-derive from endpoints: GET becomes query, POST/PUT/DELETE becomes mutation

## Isolation boundary

This package defines the sandbox that modules operate within. Modules depend ONLY on `@86d-app/core`:
- `ModuleDataService` is the sole interface for a module's own data — no Prisma, no direct DB
- `ModuleContext` provides everything a module needs at runtime — no env vars, no platform package imports
- Modules can use `fetch()` for external HTTP requests
- Module components export as `MDXComponents` for the store's component registry

The runtime (`packages/runtime`) implements these interfaces against the real platform (Prisma, env, etc.), but modules never see that layer.

## Inter-module contracts

Modules access each other's data through explicit, bilateral permission contracts:

**Provider side** — a module declares what fields it exposes and at what access level:
```ts
exports: {
  read: ["customerName", "customerEmail", "customerPhone"],
  readWrite: ["customerMetadata"]
}
```

**Consumer side** — a module declares what it requires from other modules:
```ts
requires: {
  "@86d-app/customers": {
    read: ["customerName", "customerEmail"]
  }
}
```

The runtime validates at init that every consumer requirement is a subset of what the provider permits. Read vs readWrite is enforced. No module can access fields another module hasn't explicitly exposed. Contracts are part of the public API — changing exposed fields is a semver-breaking change.

## Key details

- This is the only package module authors depend on (`@86d-app/core`)
- Uses `better-call` for type-safe endpoint definitions
- Client hooks auto-derive from endpoints: GET becomes query, POST/PUT/DELETE becomes mutation
