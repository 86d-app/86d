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

# Gift Cards Module

Gift card issuance, redemption, and balance management for 86d commerce platform.

## Installation

```sh
npm install @86d-app/gift-cards
```

## Usage

```ts
import giftCards from "@86d-app/gift-cards";

const module = giftCards({
  defaultCurrency: "USD",
  maxBalance: "50000",
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultCurrency` | `string` | `"USD"` | Default currency for new gift cards |
| `maxBalance` | `string` | — | Maximum allowed balance per card |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/gift-cards/check?code=...` | Check balance and status |
| `POST` | `/gift-cards/redeem` | Redeem a gift card for an amount |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/gift-cards` | List all gift cards |
| `POST` | `/admin/gift-cards/create` | Issue a new gift card |
| `GET` | `/admin/gift-cards/:id` | Get a gift card by ID |
| `POST` | `/admin/gift-cards/:id/update` | Update gift card details |
| `POST` | `/admin/gift-cards/:id/delete` | Delete a gift card |
| `POST` | `/admin/gift-cards/:id/credit` | Add balance to a card |
| `GET` | `/admin/gift-cards/:id/transactions` | List transactions for a card |

## Controller API

```ts
interface GiftCardController {
  create(params: {
    initialBalance: number;
    currency?: string;
    expiresAt?: Date;
    recipientEmail?: string;
    customerId?: string;
    purchaseOrderId?: string;
    note?: string;
  }): Promise<GiftCard>;

  get(id: string): Promise<GiftCard>;
  getByCode(code: string): Promise<GiftCard>;
  list(params?: {
    status?: GiftCardStatus;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ giftCards: GiftCard[]; total: number }>;

  update(id: string, data: {
    status?: GiftCardStatus;
    expiresAt?: Date;
    note?: string;
    recipientEmail?: string;
  }): Promise<GiftCard>;

  delete(id: string): Promise<void>;
  checkBalance(code: string): Promise<{ balance: number; currency: string; status: GiftCardStatus }>;
  redeem(code: string, amount: number, orderId?: string): Promise<{ transaction: GiftCardTransaction; giftCard: GiftCard }>;
  credit(id: string, amount: number, note?: string, orderId?: string): Promise<GiftCardTransaction>;
  listTransactions(giftCardId: string, params?: { limit?: number; offset?: number }): Promise<{ transactions: GiftCardTransaction[]; total: number }>;
  countAll(): Promise<number>;
}
```

## Types

```ts
type GiftCardStatus = "active" | "disabled" | "expired" | "depleted";

interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  status: GiftCardStatus;
  expiresAt?: Date;
  recipientEmail?: string;
  customerId?: string;
  purchaseOrderId?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: "debit" | "credit";
  amount: number;
  balanceAfter: number;
  orderId?: string;
  note?: string;
  createdAt: Date;
}
```
