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
> This project is under active development and is not ready for production use.

# @86d-app/registry

Git-based module registry for the 86d commerce platform. Enables modules to be sourced from local workspace directories, GitHub repositories, or npm packages.

## Overview

The registry provides the module resolution layer for 86d stores. When a store's `config.json` lists modules, the registry determines where each module lives and how to fetch it.

**Key features:**
- Resolve modules from local workspace, GitHub repos, or npm
- Generate and consume `registry.json` manifests
- Support `"*"` wildcard for including all available modules
- Graceful handling of missing modules with warnings

## Usage

### Module Specifiers

Modules can be referenced in `config.json` using several formats:

```json
{
  "modules": "*"
}
```

Or with explicit module references:

```json
{
  "modules": [
    "products",
    "@86d-app/cart",
    "github:owner/repo/modules/custom-module",
    "github:owner/repo/modules/loyalty#v2.0",
    "npm:@acme/commerce-module",
    "npm:@acme/commerce-module@^1.0.0"
  ]
}
```

| Format | Source | Description |
|---|---|---|
| `products` | local/registry | Official module by short name |
| `@86d-app/products` | local/registry | Official module by full package name |
| `github:owner/repo/path` | GitHub | Module from a GitHub repository subpath |
| `github:owner/repo/path#ref` | GitHub | GitHub module at a specific branch/tag |
| `npm:@scope/package` | npm | Module from npm registry |
| `npm:@scope/package@version` | npm | npm module with version constraint |

### Resolving Modules

```ts
import { resolveModules, readStoreConfig } from "@86d-app/registry";

const config = readStoreConfig("templates/brisa/config.json");
const resolved = await resolveModules(config, {
  root: "/path/to/project",
});

for (const mod of resolved) {
  console.log(mod.specifier.name, mod.status, mod.localPath);
}
```

### Building the Registry Manifest

```ts
import { buildManifest } from "@86d-app/registry";

const manifest = buildManifest("/path/to/project", {
  baseUrl: "https://github.com/86d-app/86d",
  defaultRef: "main",
});
// manifest.modules contains all discovered modules with metadata
```

### Fetching Remote Modules

```ts
import { fetchModule, parseSpecifier } from "@86d-app/registry";

const spec = parseSpecifier("github:owner/repo/modules/loyalty");
const result = await fetchModule(spec, "/path/to/project");

if (result.success) {
  console.log(`Installed to: ${result.localPath}`);
}
```

## CLI Integration

The registry integrates with the 86d CLI:

```sh
# Add a module from the registry
86d module add products

# Add from GitHub
86d module add github:owner/repo/modules/loyalty

# Add from npm
86d module add npm:@acme/commerce-module

# Search the registry
86d module search shipping

# Generate registry manifest
86d generate registry
```

## Config Format

The store's `config.json` supports these registry-related fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `modules` | `"*" \| string[]` | `"*"` | Module specifiers or `"*"` for all |
| `registry` | `string` | GitHub raw URL | Custom registry manifest URL |
| `moduleOptions` | `Record<string, object>` | `{}` | Per-module configuration |

## Registry Manifest

The `registry.json` file at the repo root indexes all available modules:

```json
{
  "version": 1,
  "baseUrl": "https://github.com/86d-app/86d",
  "defaultRef": "main",
  "modules": {
    "products": {
      "name": "@86d-app/products",
      "description": "Product catalog management",
      "version": "0.0.4",
      "category": "catalog",
      "path": "modules/products",
      "requires": [],
      "hasStoreComponents": true,
      "hasAdminComponents": true,
      "hasStorePages": true
    }
  }
}
```

Generate it with:

```sh
bun run generate:registry
```

## API Reference

### `parseSpecifier(raw: string): ModuleSpecifier`
Parse a module specifier string into a structured object with source type, name, and metadata.

### `resolveModules(config, options): Promise<ResolvedModule[]>`
Resolve a store config's module list into concrete entries with status (`found`, `missing`, `error`).

### `fetchModule(spec, root, manifest?): Promise<FetchResult>`
Download a module from its remote source (GitHub tarball or npm) and install it locally.

### `buildManifest(root, options?): RegistryManifest`
Scan the `modules/` directory and build a registry manifest with full metadata for each module.

### `readStoreConfig(path): StoreConfig`
Read and parse a store's `config.json` file.

### `getLocalModuleNames(root): string[]`
Get sorted list of all locally available module names.

## Buildtime Integration

The registry is used at buildtime by `scripts/generate-modules.ts`:

1. Reads `config.json` and resolves all module specifiers
2. For missing modules (registry/GitHub/npm), fetches them automatically
3. Generates the store's import files in `apps/store/generated/`

This means `bun run generate:modules` will pull any missing modules before generating code. Modules that fail to fetch are skipped with warnings.

## Notes

- When `modules` is `"*"` or omitted, all local workspace modules are included
- GitHub fetching uses the tarball API; `tar` must be available on the system
- Set `GITHUB_TOKEN` environment variable for private repos or to avoid rate limits
- npm modules are installed to `node_modules/` via `bun add` (falls back to `npm install`)
- The resolver always checks local workspace first before attempting remote sources
