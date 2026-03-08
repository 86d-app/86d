# Notifications Module — Store Components

Components exported for use in store MDX templates.

## NotificationBell

Displays a bell icon with the current unread notification count, linking to the notifications page. Fetches the unread count automatically via the module client.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `href` | `string` | No | URL the bell links to. Defaults to `"/account/notifications"`. |

### Usage in MDX

```mdx
<NotificationBell href="/account/notifications" />
```

Best used in the site header or navigation bar to give customers a persistent unread count indicator.

## NotificationInbox

Renders a full notification inbox with filtering by read/unread status, mark-as-read actions, and a mark-all-read button. Fetches and displays notifications with relative timestamps and type-based icons.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | No | Heading displayed above the notification list. Defaults to `"Notifications"`. |
| `emptyMessage` | `string` | No | Message shown when there are no notifications. Defaults to `"You're all caught up! No notifications right now."`. |

### Usage in MDX

```mdx
<NotificationInbox title="Notifications" emptyMessage="Nothing new!" />
```

Best used on a dedicated notifications page within the customer account area.

## NotificationPreferences

Allows customers to toggle notification categories on and off (order updates, promotions, shipping alerts, account alerts). Fetches current preferences and persists changes via the module client.

### Props

None. The component manages its own state and fetches data via the module client.

### Usage in MDX

```mdx
<NotificationPreferences />
```

Best used on an account settings or notification settings page where customers manage their communication preferences.
