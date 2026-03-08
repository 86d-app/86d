# Returns Module — Store Components

Components exported for use in store MDX templates.

## ReturnForm

Renders a multi-step return request form where customers select items to return, specify reasons and item conditions, choose a refund method, and submit the request. Displays a confirmation message upon successful submission.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | `string` | Yes | The ID of the order to create a return for. |
| `items` | `OrderItem[]` | Yes | Array of order line items available for return. Each item has `id`, `productName`, `quantity`, `unitPrice`, and optional `sku`. |

### Usage in MDX

```mdx
<ReturnForm orderId={orderId} items={orderItems} />
```

Best used on an order detail page to let customers initiate a return for specific items in their order.

## ReturnStatus

Displays the current status of a return request including items, refund amount, refund method, and tracking information. Fetches return details by ID from the module client.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | The ID of the return request to display status for. |

### Usage in MDX

```mdx
<ReturnStatus id={returnId} />
```

Best used on a return detail page or order history section to show customers the progress of their return request.
