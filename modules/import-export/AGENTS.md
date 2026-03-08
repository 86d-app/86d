# Import/Export Module

Manages bulk data import and export jobs for products, customers, orders, and inventory.

## Structure

```
src/
  index.ts          Factory: importExport(options?) => Module
  schema.ts         Zod models: importJob, exportJob
  service.ts        ImportExportController interface + types
  service-impl.ts   ImportExportController implementation
  store/
    endpoints/      Empty — no store-facing endpoints
  admin/
    components/
      import-export-overview.*   Overview MDX + TSX
      import-detail.*            Import detail MDX + TSX
    endpoints/
      list-imports.ts                GET    /admin/import-export/imports
      create-import.ts               POST   /admin/import-export/imports/create
      get-import.ts                  GET    /admin/import-export/imports/:id
      update-import-status.ts        PUT    /admin/import-export/imports/:id/status
      process-import-row.ts          POST   /admin/import-export/imports/:id/process-row
      complete-import.ts             POST   /admin/import-export/imports/:id/complete
      cancel-import.ts               POST   /admin/import-export/imports/:id/cancel
      delete-import.ts               DELETE /admin/import-export/imports/:id/delete
      list-exports.ts                GET    /admin/import-export/exports
      create-export.ts               POST   /admin/import-export/exports/create
      get-export.ts                  GET    /admin/import-export/exports/:id
      delete-export.ts               DELETE /admin/import-export/exports/:id/delete
```

## Options

```ts
ImportExportOptions {
  maxImportRows?: string      // default "10000"
  maxConcurrentImports?: string  // default "3"
}
```

## Data models

- **importJob**: id, type (products|customers|orders|inventory), status (pending|validating|processing|completed|failed|cancelled), filename, totalRows, processedRows, failedRows, skippedRows, errors (JSON), options (JSON: updateExisting, skipDuplicates, dryRun), createdBy?, completedAt?
- **exportJob**: id, type (products|customers|orders|inventory), status (pending|processing|completed|failed), format (csv|json), filters (JSON), totalRows, fileData?, createdBy?, completedAt?

## Patterns

- Admin-only module — no store endpoints
- Import uses row-by-row processing via `processRow()` — tracks success/failure per row
- Export data stored as serialized string in `fileData` field
- Two admin pages: overview at `/admin/import-export` and import detail at `/admin/import-export/imports/:id`
- Events: import.created/started/completed/failed/cancelled, export.created/started/completed/failed
- Option values are strings (not numbers) for config compatibility
