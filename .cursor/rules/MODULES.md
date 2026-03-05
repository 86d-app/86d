# Module System

This framework uses a modular architecture where features are built as independent modules that can be dynamically loaded based on configuration.

## How It Works

1. **Module Definition**: Modules are listed in `apps/store/templates/config.json`
2. **Auto-Generation**: The `generate:modules` script reads the config and generates `apps/store/modules.ts` with static imports
3. **Component Registration**: Module components are automatically merged into MDX components
4. **Dynamic Loading**: Templates can use any registered component in MDX files

## Module Structure

Each module follows this structure:

```
modules/[module-name]/
├── package.json          # Package definition with @86d-app/[name]
├── src/
│   ├── admin/
│   │   ├── components/   # (Optional) Admin MDX components
│   │   └── endpoints/    # (Optional) Admin API endpoints
│   ├── store/
│   │   ├── components/   # (Optional) Store MDX components
│   │   └── endpoints/    # (Optional) Store API endpoints
│   ├── hooks.ts         # (Optional) Framework hooks
│   ├── routes.ts        # (Optional) API routes
│   └── templates.tsx    # (Optional) Page templates
└── tsconfig.json
```

### Component Export Format

If a module has store components, export them from `src/store/components/index.tsx`:

```tsx
"use client";
import type { MDXComponents } from "mdx/types";

export default {
    MyComponent: () => <>Hello</>,
    AnotherComponent: ({ children }) => <div>{children}</div>,
} satisfies MDXComponents;
```

## Adding a New Module

### 1. Create Module Directory

```bash
mkdir -p modules/[module-name]/src
```

### 2. Create package.json

```json
{
    "private": true,
    "name": "@86d-app/[module-name]",
    "version": "0.0.1",
    "type": "module",
    "exports": {
        "./*": "./src/*"
    },
    "scripts": {
        "build": "tsc",
        "check": "biome check src",
        "check:fix": "biome check --write src",
        "typecheck": "tsc --noEmit"
    }
}
```

### 3. Create tsconfig.json

```json
{
    "extends": "@tsconfig/strictest/tsconfig.json",
    "compilerOptions": {
        "declaration": true,
        "declarationMap": true,
        "jsx": "react-jsx",
        "lib": ["ES2022", "DOM", "DOM.Iterable"],
        "module": "ESNext",
        "moduleResolution": "bundler",
        "noEmit": true,
        "resolveJsonModule": true,
        "target": "ES2022"
    },
    "include": ["src"]
}
```

### 4. (Optional) Create Components

Create `src/store/components/index.tsx` if the module needs store MDX components:

```tsx
"use client";
import type { MDXComponents } from "mdx/types";

export default {
    ComponentName: () => <>Component content</>,
} satisfies MDXComponents;
```

### 5. Add to Config

Edit `apps/store/templates/config.json`:

```json
{
    "modules": [
        "@86d-app/cart",
        "@86d-app/[your-module]"
    ]
}
```

### 6. Add as Workspace Dependency

If this is a workspace module, add it to `apps/store/package.json`:

```json
{
    "dependencies": {
        "@86d-app/[your-module]": "workspace:*"
    }
}
```

### 7. Initialize Module System

```bash
cd apps/store
pnpm prepare  # or pnpm generate:modules
```

The script will automatically:
- Add the module to `package.json` if not present
- Install dependencies
- Generate the `modules.ts` file

## Using External Modules

You can use modules from npm with any package name (not just @86d-app):

### Example: Adding an npm module

```json
// apps/store/templates/config.json
{
    "modules": [
        "@86d-app/cart",
        "@my-company/analytics",
        "some-ecommerce-module"
    ]
}
```

Then run:

```bash
cd apps/store
pnpm prepare  # or pnpm generate:modules
```

The script will automatically:
1. **Detect module type** - workspace vs npm
2. **Add to package.json** - adds missing modules as dependencies
3. **Install dependencies** - runs `pnpm install` if needed
4. **Generate imports** - creates static imports for all modules with components

### Module Detection Logic

- **Workspace modules**: Must be in `modules/[name]/` directory and prefixed with `@86d-app/`
- **NPM modules**: Any other module name is treated as an npm package
- Workspace modules use `workspace:*` version
- NPM modules use `latest` version (can be changed manually in package.json)

## Build Process

The module generation happens automatically using npm lifecycle hooks:

- **Development**: `pnpm dev` → `predev` → `generate:modules` → starts dev server
- **Production**: `pnpm build` → `prebuild` → `generate:modules` → builds app
- **Initial Setup**: `pnpm prepare` → runs `generate:modules` to initialize modules

You can also run it manually:

```bash
cd apps/store
pnpm generate:modules
```

## Generated Files

**DO NOT EDIT** `apps/store/modules.ts` manually. It's auto-generated from:
- Source: `apps/store/templates/config.json`
- Generator: `apps/store/scripts/generate-modules.ts`

The generated file contains:
- Static imports for all modules with components
- A merged components object for MDX
- Type-safe module list

## Module Architecture

### Hooks (Future)

Modules can expose hooks to interact with the framework:

```tsx
// src/hooks.ts
export const onPageLoad = async (context) => {
    // Custom logic
};

export const onCheckout = async (cart, user) => {
    // Custom logic
};
```

### API Routes (Future)

Modules can define API routes:

```tsx
// src/routes.ts
export const routes = {
    "GET /api/cart": async (req, res) => {
        // Handle request
    },
};
```

### Templates (Future)

Modules can provide page templates:

```tsx
// src/templates.tsx
export const ProductPage = ({ product }) => {
    return <div>...</div>;
};
```

## Troubleshooting

### Module not found

- Ensure the module is listed in `config.json`
- Check if it's in `modules/` directory or installed via npm
- Run `pnpm generate:modules` to regenerate
- Check that the module has `src/store/components/index.tsx` if you're trying to use its components

### Components not appearing in MDX

- Verify the component is exported from `src/store/components/index.tsx`
- Check that the file isn't empty
- Run `pnpm generate:modules` and check the output
- Restart the dev server

### Import errors

- Make sure the module is added to `apps/store/package.json` dependencies
- Run `pnpm install` to install workspace dependencies
- Check that the module's `package.json` has correct `exports` field
