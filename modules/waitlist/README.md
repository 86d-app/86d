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
> This project is under active development and is not ready for production use. Please proceed with caution. Use at your own risk.

# Waitlist Module

Product waitlist for out-of-stock notifications. Customers can subscribe by email to be notified when products are back in stock, and admins can track demand and trigger notifications.

## Installation

```sh
npm install @86d-app/waitlist
```

## Usage

```ts
import waitlist from "@86d-app/waitlist";

const module = waitlist({
  maxEntriesPerEmail: "10",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `maxEntriesPerEmail` | `string` | -- | Maximum waitlist entries per email address |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/waitlist/join` | Subscribe to a product waitlist |
| `POST` | `/waitlist/leave` | Unsubscribe from a waitlist |
| `GET` | `/waitlist/check/:productId` | Check if the current user is on a product's waitlist |
| `GET` | `/waitlist/mine` | List the current user's waitlist entries |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/waitlist` | List all waitlist entries (filterable by product, email, status) |
| `GET` | `/admin/waitlist/summary` | Waitlist analytics (totals, top products) |
| `POST` | `/admin/waitlist/:productId/notify` | Mark all waiting entries for a product as notified |
| `DELETE` | `/admin/waitlist/:id/delete` | Delete a waitlist entry |

## Controller API

```ts
interface WaitlistController {
  subscribe(params: {
    productId: string;
    productName: string;
    variantId?: string;
    variantLabel?: string;
    email: string;
    customerId?: string;
  }): Promise<WaitlistEntry>;

  unsubscribe(id: string): Promise<boolean>;
  cancelByEmail(email: string, productId: string): Promise<boolean>;
  getEntry(id: string): Promise<WaitlistEntry | null>;
  isSubscribed(email: string, productId: string): Promise<boolean>;

  listByProduct(productId: string, params?: {
    status?: WaitlistStatus;
    take?: number;
    skip?: number;
  }): Promise<WaitlistEntry[]>;

  listByEmail(email: string, params?: {
    take?: number;
    skip?: number;
  }): Promise<WaitlistEntry[]>;

  listAll(params?: {
    productId?: string;
    email?: string;
    status?: WaitlistStatus;
    take?: number;
    skip?: number;
  }): Promise<WaitlistEntry[]>;

  countByProduct(productId: string): Promise<number>;
  markNotified(productId: string): Promise<number>;
  markPurchased(email: string, productId: string): Promise<boolean>;
  getSummary(): Promise<WaitlistSummary>;
}
```

## Types

```ts
type WaitlistStatus = "waiting" | "notified" | "purchased" | "cancelled";

interface WaitlistEntry {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  email: string;
  customerId?: string;
  status: WaitlistStatus;
  notifiedAt?: Date;
  createdAt: Date;
}

interface WaitlistSummary {
  totalWaiting: number;
  totalNotified: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    count: number;
  }>;
}
```

## Notes

- Requires the `inventory` module.
- Subscribing with the same email + product returns the existing entry (no duplicates).
- `cancelByEmail` transitions entries to "cancelled" rather than deleting them.
- `markNotified` bulk-updates all "waiting" entries for a product to "notified" with a timestamp.
