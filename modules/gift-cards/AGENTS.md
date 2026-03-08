# Gift Cards Module

Digital gift cards with unique redemption codes, balance tracking, and transaction history.

## Structure

```
src/
  index.ts          Factory: giftCards(options?) => Module
  schema.ts         Data models: giftCard, giftCardTransaction
  service.ts        GiftCardController interface
  service-impl.ts   GiftCardController implementation
  store/
    components/     Store-facing MDX + TSX (balance check, redeem)
    endpoints/
      check-balance.ts    GET  /gift-cards/check
      redeem.ts           POST /gift-cards/redeem
  admin/
    components/     Admin MDX + TSX (overview)
    endpoints/
      list-gift-cards.ts              GET    /admin/gift-cards
      create-gift-card.ts             POST   /admin/gift-cards/create
      get-gift-card.ts                GET    /admin/gift-cards/:id
      update-gift-card.ts             PUT    /admin/gift-cards/:id/update
      delete-gift-card.ts             DELETE /admin/gift-cards/:id/delete
      credit-gift-card.ts             POST   /admin/gift-cards/:id/credit
      list-gift-card-transactions.ts  GET    /admin/gift-cards/:id/transactions
```

## Options

```ts
GiftCardOptions {
  defaultCurrency?: string  // default "USD"
  maxBalance?: string       // maximum gift card value
}
```

## Data models

- **giftCard**: id, code (unique, e.g. GIFT-XXXX-XXXX), initialBalance, currentBalance, currency, status (active|disabled|expired|depleted), expiresAt?, recipientEmail?, customerId?, purchaseOrderId?, note?
- **giftCardTransaction**: id, giftCardId, type (debit|credit), amount, balanceAfter, orderId?, note?, createdAt

## Events

- Emits: `giftCard.created`, `giftCard.redeemed`, `giftCard.credited`, `giftCard.depleted`

## Patterns

- Redemption codes are generated as uppercase alphanumeric (GIFT-XXXX-XXXX format)
- `redeem(code, amount)` debits the card; sets status to "depleted" when balance reaches 0
- `credit(id, amount)` tops up a gift card (e.g. for refunds)
- `checkBalance(code)` returns balance/currency/status without auth
- `getByCode(code)` looks up a gift card by its redemption code
- Cards can be linked to a customer (`customerId`) or left anonymous
