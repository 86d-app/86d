# Database

## Overview

The platform uses PostgreSQL with Prisma ORM. The database package (`packages/db`) has been removed and needs to be reimplemented.

## Schema Architecture

The Prisma schema was split into multiple files:

| File | Purpose |
|------|---------|
| `schema.prisma` | Main config (datasource, generator) |
| `auth.prisma` | User, Session, Account, Verification |
| `stores.prisma` | Store and Domain models |
| `modules.prisma` | Module and ModuleData (plugin system) |
| `enums.prisma` | Shared enums (Currency, Country, etc.) |

## Key Models

### Module System

The module system stores all plugin data in a flexible JSON structure:

```
Module (1) → (*) ModuleData
```

- **Module**: Represents an enabled module for a store (e.g., "products", "cart")
- **ModuleData**: Stores entity data with `entityType` and `entityId` for querying

### Multi-Tenancy Hierarchy

```
User → Member → Organization → Store → Module → ModuleData
```

## Environment Variables

Required in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/dbname"
```
