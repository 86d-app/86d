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

# Notifications Module

In-app and email notification system for customers. Supports multiple notification types and channels, unread tracking with badge counts, and per-customer preference management.

## Installation

```sh
npm install @86d-app/notifications
```

## Usage

```ts
import notifications from "@86d-app/notifications";

const module = notifications({
  maxPerCustomer: "500",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `maxPerCustomer` | `string` | `"500"` | Maximum notifications stored per customer before auto-cleanup |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/notifications` | List the current customer's notifications |
| `GET` | `/notifications/unread-count` | Get unread notification count |
| `GET` | `/notifications/preferences` | Get notification preferences |
| `POST` | `/notifications/preferences/update` | Update notification preferences |
| `GET` | `/notifications/:id` | Get a single notification |
| `POST` | `/notifications/:id/read` | Mark a notification as read |
| `POST` | `/notifications/read-all` | Mark all notifications as read |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/notifications` | List all notifications (paginated) |
| `POST` | `/admin/notifications/create` | Create a notification for a customer |
| `GET` | `/admin/notifications/stats` | Get notification statistics |
| `POST` | `/admin/notifications/bulk-delete` | Delete multiple notifications |
| `GET` | `/admin/notifications/:id` | Get a notification |
| `PUT` | `/admin/notifications/:id/update` | Update a notification |
| `DELETE` | `/admin/notifications/:id/delete` | Delete a notification |

## Controller API

The `NotificationsController` interface is exported for inter-module use (e.g. orders sending shipping notifications).

```ts
interface NotificationsController {
  create(params: {
    customerId: string;
    type?: NotificationType;
    channel?: NotificationChannel;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification>;

  get(id: string): Promise<Notification | null>;
  update(id: string, params: { title?: string; body?: string; actionUrl?: string; metadata?: Record<string, unknown> }): Promise<Notification | null>;
  delete(id: string): Promise<boolean>;
  list(params?: { customerId?: string; type?: NotificationType; read?: boolean; take?: number; skip?: number }): Promise<Notification[]>;

  markRead(id: string): Promise<Notification | null>;
  markAllRead(customerId: string): Promise<number>;
  unreadCount(customerId: string): Promise<number>;
  getStats(): Promise<NotificationStats>;
  bulkDelete(ids: string[]): Promise<number>;

  getPreferences(customerId: string): Promise<NotificationPreference>;
  updatePreferences(customerId: string, params: { orderUpdates?: boolean; promotions?: boolean; shippingAlerts?: boolean; accountAlerts?: boolean }): Promise<NotificationPreference>;
}
```

## Types

```ts
type NotificationType = "info" | "success" | "warning" | "error" | "order" | "shipping" | "promotion";
type NotificationChannel = "in_app" | "email" | "both";

interface Notification {
  id: string;
  customerId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  actionUrl?: string;
  metadata: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

interface NotificationPreference {
  id: string;
  customerId: string;
  orderUpdates: boolean;
  promotions: boolean;
  shippingAlerts: boolean;
  accountAlerts: boolean;
  updatedAt: Date;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}
```

## Store Components

### NotificationBell

Displays a bell icon with the current unread notification count, linking to the notifications page. Fetches the unread count automatically via the module client.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `href` | `string` | No | URL the bell links to. Defaults to `"/account/notifications"`. |

#### Usage in MDX

```mdx
<NotificationBell href="/account/notifications" />
```

Best used in the site header or navigation bar to give customers a persistent unread count indicator.

### NotificationInbox

Renders a full notification inbox with filtering by read/unread status, mark-as-read actions, and a mark-all-read button. Fetches and displays notifications with relative timestamps and type-based icons.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | No | Heading displayed above the notification list. Defaults to `"Notifications"`. |
| `emptyMessage` | `string` | No | Message shown when there are no notifications. Defaults to `"You're all caught up! No notifications right now."`. |

#### Usage in MDX

```mdx
<NotificationInbox title="Notifications" emptyMessage="Nothing new!" />
```

Best used on a dedicated notifications page within the customer account area.

### NotificationPreferences

Allows customers to toggle notification categories on and off (order updates, promotions, shipping alerts, account alerts). Fetches current preferences and persists changes via the module client.

#### Props

None. The component manages its own state and fetches data via the module client.

#### Usage in MDX

```mdx
<NotificationPreferences />
```

Best used on an account settings or notification settings page where customers manage their communication preferences.

## Notes

- Preferences default to all categories enabled; customers opt out individually.
- The `unreadCount` endpoint returns a plain number, optimized for badge display.
- `markAllRead` returns the count of notifications that were marked read.
- Notifications support an optional `actionUrl` for deep-linking to relevant pages.
