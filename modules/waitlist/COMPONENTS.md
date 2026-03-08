# Waitlist Module — Store Components

Components exported for use in store MDX templates.

## BellIcon

A small SVG bell icon that visually indicates whether the customer is subscribed to a waitlist. Renders as filled when active and outlined when inactive.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `active` | `boolean` | Yes | When `true`, renders a filled bell icon; when `false`, renders an outlined bell icon. |

### Usage in MDX

```mdx
<BellIcon active={true} />
```

Best used as a visual indicator inside other waitlist components or next to product titles to show subscription status.

## WaitlistButton

A join/leave waitlist button for a specific product. Shows the current waitlist count, handles email collection for guest users, and toggles subscription state. Includes an inline email form when no email is provided.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `productId` | `string` | Yes | The ID of the product to join the waitlist for. |
| `productName` | `string` | Yes | Display name of the product, sent along with the waitlist entry. |
| `variantId` | `string` | No | Optional variant ID if the waitlist is for a specific product variant. |
| `variantLabel` | `string` | No | Optional human-readable variant label (e.g., "Size M, Blue"). |
| `email` | `string` | No | Pre-filled customer email. When omitted, the component shows an email input form. |
| `customerId` | `string` | No | Optional customer ID for authenticated users. |

### Usage in MDX

```mdx
<WaitlistButton productId={product.id} productName={product.name} email={customer.email} />
```

Best used on product detail pages for out-of-stock items to let customers sign up for restock notifications.

## WaitlistPage

Displays all waitlist entries for a given customer email, showing product names, variant labels, join dates, and statuses. Customers can remove themselves from individual waitlists.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `email` | `string` | Yes | The customer's email address used to look up their waitlist entries. |

### Usage in MDX

```mdx
<WaitlistPage email={customer.email} />
```

Best used on a dedicated account page where customers can view and manage all the products they are waiting for.
