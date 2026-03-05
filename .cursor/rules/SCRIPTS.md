# Store Scripts

## Overview

This directory contains initialization and utility scripts for the store application.

## Core Scripts

### `prepare.ts` - Master Initialization Script

The orchestrator that runs all initialization tasks before dev/build.

**Invoked via:**
- `pnpm prepare` (manual)
- Automatically via `predev`, `prebuild` hooks

**Current steps:**
1. `generate-modules.ts` - Generate module imports from config.json

**Future steps (examples):**
```typescript
const INIT_STEPS: InitStep[] = [
    {
        name: "generate-modules",
        script: "generate-modules.ts",
        description: "Generating module imports",
    },
    {
        name: "pull-templates",
        script: "pull-templates.ts",
        description: "Pulling templates from repository",
    },
    {
        name: "validate-config",
        script: "validate-config.ts",
        description: "Validating configuration",
    },
];
```

### `generate-modules.ts` - Module Generator

Generates `modules.ts` from `templates/config.json`.

**Features:**
- Reads module list from config
- Detects workspace vs npm modules
- Adds missing modules to package.json
- Installs dependencies
- Generates static imports

**Can be run standalone:**
```bash
pnpm generate:modules
```

## Adding New Initialization Steps

### 1. Create Your Script

Create a new script in `apps/store/scripts/`:

```typescript
#!/usr/bin/env tsx
// scripts/pull-templates.ts

import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

const STORE_ROOT = resolve(import.meta.dirname, "..");
const TEMPLATES_DIR = join(STORE_ROOT, "templates");

async function pullTemplates() {
    console.log("Pulling templates from repository...");

    // Your implementation here
    // e.g., git clone, API fetch, etc.

    console.log("✓ Templates pulled successfully");
}

pullTemplates().catch((error) => {
    console.error("Failed to pull templates:", error);
    process.exit(1);
});
```

### 2. Add to prepare.ts

Edit `scripts/prepare.ts` and add your step to the `INIT_STEPS` array:

```typescript
const INIT_STEPS: InitStep[] = [
    {
        name: "generate-modules",
        script: "generate-modules.ts",
        description: "Generating module imports",
    },
    {
        name: "pull-templates",
        script: "pull-templates.ts",  // Your new script
        description: "Pulling templates from repository",
    },
];
```

### 3. Test

```bash
cd apps/store
pnpm prepare
```

Your script will now run automatically before dev/build!

## Script Execution Order

```
pnpm dev
    ↓
predev hook
    ↓
pnpm prepare
    ↓
tsx scripts/prepare.ts
    ↓
For each INIT_STEP:
    tsx scripts/{script-name}.ts
    ↓
next dev --turbo
```

## Best Practices

1. **Exit on Error**: Use `process.exit(1)` on failures
2. **Clear Output**: Use console.log with ✓, →, ✗ symbols
3. **Idempotent**: Scripts should be safe to run multiple times
4. **Fast**: Keep initialization quick; cache when possible
5. **Self-Contained**: Each script should work standalone

## Example Script Structure

```typescript
#!/usr/bin/env tsx

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const STORE_ROOT = resolve(import.meta.dirname, "..");

async function myScript() {
    // 1. Validate inputs
    if (!existsSync(somePath)) {
        console.error("✗ Error: missing file");
        process.exit(1);
    }

    // 2. Do work
    console.log("Processing...");

    // 3. Report success
    console.log("✓ Complete");
}

myScript().catch((error) => {
    console.error("✗ Failed:", error.message);
    process.exit(1);
});
```

## Debugging

Run individual scripts:
```bash
tsx scripts/generate-modules.ts
tsx scripts/pull-templates.ts
```

Skip preparation during dev (not recommended):
```bash
# This won't work due to lifecycle hooks
# You'd need to temporarily remove predev from package.json
```

View full initialization output:
```bash
pnpm prepare
```
