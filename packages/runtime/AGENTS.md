# Runtime

Store runtime engine. The bridge between sandboxed modules and the real platform. Modules never see Prisma, env vars, or each other — they only see what the runtime provides.

## Structure

```
src/
  adapters.ts                Adapter implementations for module data access
  context.ts                 Runtime context creation
  routers.ts                 Router setup for module endpoints
  universal-data-service.ts  Unified data service backing ModuleDataService
```

## Responsibilities

- Implements `ModuleDataService` against real Prisma/database layer
- Resolves inter-module contracts at init: validates that every consumer's requirements are a subset of what providers expose
- Mediates all cross-module data access — enforces read vs readWrite permissions
- Wires up adapters, authentication, and data services per request
- Injects module options (including third-party credentials) from platform config — modules never read env vars

## Inter-module contract resolution

At init, the runtime:
1. Collects all modules' `exports` declarations (what they share)
2. Collects all modules' `requires` declarations (what they need)
3. Validates every requirement is satisfied by a provider's exports
4. Rejects startup if any contract is unsatisfied or exceeds permissions
5. Creates scoped data access proxies that enforce field-level read/readWrite boundaries

## Graceful degradation

Boot is resilient — individual module failures don't crash the store:
- If a module's `init()` throws, it's marked as "error" and skipped
- Modules depending on a failed module are also marked as "error"
- Boot only throws if ALL modules fail (zero successful initializations)
- `getHealth()` returns status "error" when any module has errors (but store still serves)
- `createRequestContext()` includes only successfully initialized modules in the data registry

## Key details

- Depends on: `@86d-app/core`, `better-call`, `packages/db`, `packages/env`
- This is the ONLY package that touches both the module world and the platform world
- `UniversalDataService` implements the `ModuleDataService` interface modules consume
