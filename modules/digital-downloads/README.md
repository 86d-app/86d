# @86d-app/digital-downloads

Secure file delivery for the 86d commerce platform. Associates downloadable files with products and generates expiring, limited-use tokens for order fulfillment.

![version](https://img.shields.io/badge/version-0.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Installation

```sh
npm install @86d-app/digital-downloads
```

## Usage

```ts
import digitalDownloads from "@86d-app/digital-downloads";
import { createModuleClient } from "@86d-app/core";

const client = createModuleClient([
  digitalDownloads({
    defaultTokenExpiryDays: 7,
    defaultMaxDownloads: 3,
  }),
]);
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultTokenExpiryDays` | `number` | `undefined` | Default token expiry in days (0 or undefined = no expiry) |
| `defaultMaxDownloads` | `number` | `undefined` | Default max downloads per token (0 or undefined = unlimited) |

## Token Flow

```
1. Admin creates a file record linked to a product
2. After order payment, create a download token for the customer
3. Customer accesses GET /downloads/:token
4. useToken validates and increments the download count
5. Returns the file URL on success
```

Token validation checks in order:
1. Token not found
2. `revokedAt` is set (permanently disabled)
3. `expiresAt` is in the past
4. `downloadCount >= maxDownloads`

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/downloads/:token` | Consume a token and retrieve the file URL |
| `GET` | `/downloads/me` | List all download tokens for an email address |

Query parameters for `GET /downloads/me`: `email` (required)

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/downloads/files` | List all downloadable files |
| `POST` | `/admin/downloads/files/create` | Create a file record |
| `DELETE` | `/admin/downloads/files/:id/delete` | Delete a file record |
| `GET` | `/admin/downloads/tokens` | List all download tokens |
| `POST` | `/admin/downloads/tokens/create` | Create a download token |

## Controller API

```ts
// ── Files ──────────────────────────────────────────────────────────────

controller.createFile(params: {
  productId: string;
  name: string;
  url: string;         // raw storage URL
  fileSize?: number;
  mimeType?: string;
  isActive?: boolean;
}): Promise<DownloadableFile>

controller.getFile(id: string): Promise<DownloadableFile | null>

controller.listFiles(params?: {
  productId?: string;
  take?: number;
  skip?: number;
}): Promise<DownloadableFile[]>

controller.updateFile(id: string, params: {
  name?: string;
  url?: string;
  fileSize?: number;
  mimeType?: string;
  isActive?: boolean;
}): Promise<DownloadableFile | null>

controller.deleteFile(id: string): Promise<boolean>

// ── Tokens ─────────────────────────────────────────────────────────────

// Create a download token for a customer after order payment
controller.createToken(params: {
  fileId: string;
  email: string;
  orderId?: string;
  maxDownloads?: number;
  expiresAt?: Date;
}): Promise<DownloadToken>

// Look up a token record by its token value (UUID), not its ID
controller.getTokenByValue(token: string): Promise<DownloadToken | null>

// Validate and consume a token — increments downloadCount on success
controller.useToken(token: string): Promise<{
  ok: boolean;
  reason?: string;     // "Token not found" | "Token revoked" | "Token expired" | "Download limit reached"
  file?: DownloadableFile;
  token?: DownloadToken;
}>

// Permanently disable a token
controller.revokeToken(token: string): Promise<boolean>

// List all tokens for a specific email address
controller.listTokensByEmail(params: {
  email: string;
  take?: number;
  skip?: number;
}): Promise<DownloadToken[]>

// List tokens with optional filters
controller.listTokens(params?: {
  fileId?: string;
  orderId?: string;
  email?: string;
  take?: number;
  skip?: number;
}): Promise<DownloadToken[]>
```

## Example: Order Fulfillment

```ts
// 1. After payment confirmed, issue download tokens for each purchased file
const files = await controller.listFiles({ productId: "prod_ebook" });

for (const file of files) {
  await controller.createToken({
    fileId: file.id,
    email: "customer@example.com",
    orderId: "ord_abc123",
    maxDownloads: 5,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });
}

// 2. Customer hits GET /downloads/:token
// The endpoint calls useToken internally and redirects to the file URL

// 3. Admin revokes a token if needed
await controller.revokeToken("uuid-token-value");
```

## Types

```ts
interface DownloadableFile {
  id: string;
  productId: string;
  name: string;
  /** Raw storage URL — application handles redirects or signed URLs */
  url: string;
  fileSize?: number;
  mimeType?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DownloadToken {
  id: string;
  /** UUID token value used in the download URL — distinct from id */
  token: string;
  fileId: string;
  orderId?: string;
  email: string;
  maxDownloads?: number;
  downloadCount: number;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

> Note: The controller key uses a hyphen: `"digital-downloads"`. Access it via bracket notation: `controllers["digital-downloads"]`.
