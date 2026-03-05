# Orders Module — Store Components

Components exported for use in store MDX templates. Import via the component registry (auto-registered when the module is in `templates/brisa/config.json`).

## OrderHistory

Paginated list of a customer's orders. Fetches its own data. Requires authentication — shows sign-in prompt for unauthenticated users.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSelectOrder` | `(id: string) => void` | — | Callback when an order is clicked. If omitted, navigates via URL query param |
| `pageSize` | `number` | `10` | Orders per page |

### Usage in MDX

```mdx
<OrderHistory />

<OrderHistory pageSize={5} onSelectOrder={handleSelect} />
```

Typically placed on a customer account page (e.g. `templates/brisa/account/orders.mdx`).

## OrderDetail

Full order detail view with items, totals, fulfillment tracking, shipping/billing addresses, order notes, and cancel button. Fetches its own data.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | `string` | Order ID to display |
| `onBack` | `() => void` | Callback for back navigation. If omitted, navigates via URL |

### Usage in MDX

```mdx
<OrderDetail orderId={selectedOrderId} onBack={handleBack} />
```

## OrderReturns

Returns section within an order detail view. Shows existing return requests and a form to submit new ones. Fetches its own data.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | `string` | Order ID |
| `items` | `OrderItem[]` | Order items (for return item selection) |
| `orderStatus` | `string` | Current order status (determines if returns are allowed) |

### Usage in MDX

```mdx
<OrderReturns orderId={order.id} items={order.items} orderStatus={order.status} />
```

Returns are available for orders with status "completed" or "processing".
