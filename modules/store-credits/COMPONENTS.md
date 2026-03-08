# Store Credits Module — Store Components

Components exported for use in store MDX templates.

## StoreCreditApply

Allows customers to apply their store credit balance toward an order during checkout. Displays the current balance, calculates the maximum applicable amount based on the order total, and fires a callback after credits are applied.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | Yes | The ID of the customer whose store credits to apply. |
| `orderTotal` | `number` | No | The order total in cents. When provided, limits the applied amount to the lesser of the balance and order total. |
| `onApplied` | `(amountApplied: number, remainingBalance: number) => void` | No | Callback fired after credits are successfully applied, receiving the amount applied and the remaining balance. |

### Usage in MDX

```mdx
<StoreCreditApply customerId={customerId} orderTotal={totalInCents} />
```

Best used on the checkout page to let customers redeem store credits against their order.

## StoreCreditBalance

Displays the customer's current store credit balance, account status, and currency. Fetches balance data automatically from the module client.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | Yes | The ID of the customer whose balance to display. |

### Usage in MDX

```mdx
<StoreCreditBalance customerId={customerId} />
```

Best used on a customer account dashboard or wallet page to show available store credit.

## StoreCreditTransactions

Displays a paginated list of store credit transactions (credits and debits) for a customer, including amounts, reasons, and dates.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `customerId` | `string` | Yes | The ID of the customer whose transactions to display. |
| `limit` | `number` | No | Maximum number of transactions to fetch. When omitted, returns all transactions. |

### Usage in MDX

```mdx
<StoreCreditTransactions customerId={customerId} limit={10} />
```

Best used on a store credit detail page or account section to show the customer's credit history.
