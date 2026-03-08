# Notifications Module

In-app and email notification system for customers with per-user preferences and unread tracking.

## Structure

```
src/
  index.ts          Factory: notifications(options?) => Module
  schema.ts         Zod models: notification, preference
  service.ts        NotificationsController interface + types
  service-impl.ts   NotificationsController implementation
  admin/
    components/
      index.tsx                  Admin component exports
      notification-list.tsx      Notification list table (.tsx logic)
      notification-list.mdx      Admin template
      notification-composer.tsx  Compose notification UI (.tsx logic)
      notification-composer.mdx  Admin template
    endpoints/
      index.ts                   Endpoint map
      list-notifications.ts      GET  /admin/notifications
      create-notification.ts     POST /admin/notifications/create
      get-notification.ts        GET  /admin/notifications/:id
      update-notification.ts     PUT  /admin/notifications/:id/update
      delete-notification.ts     DELETE /admin/notifications/:id/delete
      stats.ts                   GET  /admin/notifications/stats
      bulk-delete.ts             POST /admin/notifications/bulk-delete
  store/
    components/
      _hooks.ts                  Client-side hooks
      _utils.ts                  Utility helpers
      index.tsx                  Store component exports
      notification-bell.tsx      Bell icon with unread badge
      notification-bell.mdx      Store template
      notification-inbox.tsx     Full inbox view
      notification-inbox.mdx     Store template
      notification-preferences.tsx  Preference toggles
      notification-preferences.mdx  Store template
    endpoints/
      index.ts                   Endpoint map
      list-my-notifications.ts   GET  /notifications
      get-notification.ts        GET  /notifications/:id
      mark-read.ts               POST /notifications/:id/read
      mark-all-read.ts           POST /notifications/read-all
      unread-count.ts            GET  /notifications/unread-count
      get-preferences.ts         GET  /notifications/preferences
      update-preferences.ts      POST /notifications/preferences/update
```

## Options

```ts
NotificationsOptions {
  maxPerCustomer?: string  // max stored per customer before cleanup, default "500"
}
```

## Data models

- **notification**: id, customerId, type (info|success|warning|error|order|shipping|promotion), channel (in_app|email|both), title, body, actionUrl?, metadata, read, readAt?, createdAt
- **preference**: id, customerId, orderUpdates, promotions, shippingAlerts, accountAlerts, updatedAt

## Patterns

- Preferences are per-customer toggles controlling which notification categories they receive
- `unreadCount` endpoint is optimized for badge display (returns just a number)
- `markAllRead` returns the count of notifications marked
- Admin can compose and send notifications to specific customers
- Stats endpoint returns total, unread, and per-type breakdown
