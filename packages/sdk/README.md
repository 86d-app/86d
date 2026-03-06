# @86d-app/sdk

SDK for 86d store configuration. Resolves store config from the 86d hosted API or local template files.

## Installation

```bash
bun add @86d-app/sdk
```

## Usage

### Resolve store config

```ts
import { getStoreConfig } from "@86d-app/sdk";

// With STORE_ID set (UUID): fetches from 86d API
// Without STORE_ID: loads from template path
const config = await getStoreConfig({
  templatePath: "/path/to/templates/brisa/config.json",
  fallbackToTemplateOnError: true,
});

console.log(config.name, config.modules);
```

### Load from template only

```ts
import { loadFromTemplate } from "@86d-app/sdk";

const config = loadFromTemplate("./templates/brisa/config.json");
```

### Fetch from API directly

```ts
import { fetchFromApi } from "@86d-app/sdk";

const config = await fetchFromApi(
  "store-uuid-here",
  "https://api.86d.app",
  "optional-api-key"
);
```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `storeId` | Store UUID | `process.env.STORE_ID` |
| `apiBaseUrl` | 86d API base URL | `process.env.86D_API_URL` or `https://api.86d.app` |
| `apiKey` | API key for auth | `process.env.86D_API_KEY` |
| `templatePath` | Path to config.json | Required when no STORE_ID |
| `fallbackToTemplateOnError` | Use template if API fails | `false` |

## Types

```ts
import type { Config, IconLogoVariant, ThemeVariables } from "@86d-app/sdk";
import { DEFAULT_CONFIG } from "@86d-app/sdk";
```

## API endpoint

When `STORE_ID` is set, the SDK calls:

```
GET {apiBaseUrl}/v1/stores/{storeId}
Authorization: Bearer {apiKey}  # if apiKey provided
```

The response must match the `Config` shape (theme, name, favicon, icon, logo, modules, moduleOptions, variables).
