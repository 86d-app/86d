# Notifications Module

In-app and email notification system with templates, batch send, priority levels, event emission, and per-customer preferences.

## Structure

```
src/
  index.ts          Factory: notifications(options?) => Module
  schema.ts         Zod models: notification, template, preference
  service.ts        NotificationsController interface + types
  service-impl.ts   NotificationsController implementation
  admin/
    components/
      index.tsx                           Admin component exports
      notification-list.tsx               Notification list table
      notification-list.mdx               Admin template
      notification-composer.tsx            Compose notification UI
      notification-composer.mdx            Admin template
      notification-template-list.tsx       Template management UI
      notification-template-list.mdx       Admin template
    endpoints/
      index.ts                   Endpoint map
      list-notifications.ts      GET  /admin/notifications
      create-notification.ts     POST /admin/notifications/create
      get-notification.ts        GET  /admin/notifications/:id
      update-notification.ts     POST /admin/notifications/:id/update
      delete-notification.ts     POST /admin/notifications/:id/delete
      stats.ts                   GET  /admin/notifications/stats
      bulk-delete.ts             POST /admin/notifications/bulk-delete
      batch-send.ts              POST /admin/notifications/batch-send
      list-preferences.ts       GET  /admin/notifications/preferences
      get-customer-preferences.ts    GET  /admin/notifications/preferences/:customerId
      update-customer-preferences.ts POST /admin/notifications/preferences/:customerId/update
      delete-customer-preferences.ts POST /admin/notifications/preferences/:customerId/delete
      list-templates.ts          GET  /admin/notifications/templates
      create-template.ts         POST /admin/notifications/templates/create
      get-template.ts            GET  /admin/notifications/templates/:id
      update-template.ts         POST /admin/notifications/templates/:id/update
      delete-template.ts         POST /admin/notifications/templates/:id/delete
      send-from-template.ts      POST /admin/notifications/templates/send
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
      delete-notification.ts     POST /notifications/:id/delete
      mark-all-read.ts           POST /notifications/read-all
      unread-count.ts            GET  /notifications/unread-count
      get-preferences.ts         GET  /notifications/preferences
      update-preferences.ts      POST /notifications/preferences/update
```

## Options

```ts
NotificationsOptions {
  maxPerCustomer?: string  // max stored per customer before auto-cleanup, default "500"
}
```

## Data models

- **notification**: id, customerId, type, channel, priority (low|normal|high|urgent), title, body, actionUrl?, metadata, read, readAt?, createdAt
- **template**: id, slug, name, type, channel, priority, titleTemplate, bodyTemplate, actionUrlTemplate?, variables (string[]), active, createdAt, updatedAt
- **preference**: id, customerId, orderUpdates, promotions, shippingAlerts, accountAlerts, updatedAt

## Events

The module emits these events via `ScopedEventEmitter`:

- `notifications.created` — `{ notificationId, customerId, type, priority }` — on every `create()` call
- `notifications.read` — `{ notificationId, customerId }` — when a notification is first marked as read (idempotent: not re-emitted)
- `notifications.all_read` — `{ customerId, count }` — when `markAllRead()` processes >0 notifications

Events are fire-and-forget (`void events.emit(...)`) — failures do not break operations.

## Key patterns

- Controller accepts `events?: ScopedEventEmitter` and `options?: { maxPerCustomer?: number }` parameters
- `maxPerCustomer` enforcement happens after every `create()` — oldest notifications are auto-deleted when limit exceeded
- Templates use `{{variable}}` interpolation — unknown variables are left as-is
- `sendFromTemplate` takes templateId + customerIds + variables → creates one notification per customer
- `batchSend` sends identical notifications to up to 500 customers at once
- Preferences are lazy-created: defaults returned without persisting until first update
- Admin can manage customer preferences (view, update, reset/delete)
- Stats include both `byType` and `byPriority` breakdowns
- Template slugs must be unique (lowercase alphanumeric with hyphens)
- Inactive templates cannot be used to send notifications
- Store delete endpoint verifies ownership before deletion (returns 404 if not owner)
