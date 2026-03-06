# @86d-app/sdk

SDK package for 86d store configuration and API integration.

## Purpose

Resolves store configuration from either:
- **86d hosted API** — when `STORE_ID` is set (valid UUID)
- **Template config.json** — when `STORE_ID` is absent or invalid

## Structure

```
packages/sdk/
  src/
    index.ts              Main exports
    get-store-config.ts   Resolution logic (API vs template)
    fetch-from-api.ts     GET /v1/stores/:id from 86d API
    load-from-template.ts readFileSync from template path
    types.ts              Config, IconLogoVariant, ThemeVariables
```

## Key exports

- `getStoreConfig(options?)` — async; primary entry point
- `loadFromTemplate(templatePath)` — sync; load from local JSON
- `fetchFromApi(storeId, apiBaseUrl, apiKey?)` — async; fetch from API
- `Config`, `DEFAULT_CONFIG`, `GetStoreConfigOptions`

## Environment variables

- `STORE_ID` — optional UUID; when set and valid, fetches from API
- `86D_API_URL` — optional; default `https://api.86d.app`
- `86D_API_KEY` — optional; Bearer token for API auth

## Usage

```ts
import { getStoreConfig } from "@86d-app/sdk";

const config = await getStoreConfig({
  templatePath: "/path/to/templates/brisa/config.json",
  fallbackToTemplateOnError: true,
});
```

## Dependencies

- `zod` — response validation
- No `db` or `env` — standalone; reads `process.env` directly
