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

# Tax Module

Tax calculation and management module for 86d commerce platform.

## Installation

```sh
npm install @86d-app/tax
```

## Usage

```ts
import tax from "@86d-app/tax";

const module = tax({
  taxShipping: false,
});
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `taxShipping` | `boolean` | `false` | Whether to apply tax to shipping amounts |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/tax/calculate` | Calculate tax for line items at an address |
| `GET` | `/tax/rates?country=...&state=...` | Get applicable tax rates for a jurisdiction |

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/tax/rates` | List all tax rates |
| `POST` | `/admin/tax/rates/create` | Create a new tax rate |
| `GET` | `/admin/tax/rates/:id` | Get a tax rate by ID |
| `POST` | `/admin/tax/rates/:id/update` | Update a tax rate |
| `POST` | `/admin/tax/rates/:id/delete` | Delete a tax rate |
| `GET` | `/admin/tax/categories` | List tax categories |
| `POST` | `/admin/tax/categories/create` | Create a tax category |
| `POST` | `/admin/tax/categories/:id/delete` | Delete a tax category |
| `GET` | `/admin/tax/exemptions` | List tax exemptions |
| `POST` | `/admin/tax/exemptions/create` | Create a tax exemption |
| `POST` | `/admin/tax/exemptions/:id/delete` | Delete a tax exemption |

## Controller API

```ts
interface TaxController {
  createRate(params: {
    name: string;
    country: string;
    state?: string;
    city?: string;
    postalCode?: string;
    rate: number;
    type?: TaxRateType;
    categoryId?: string;
    enabled?: boolean;
    priority?: number;
    compound?: boolean;
    inclusive?: boolean;
  }): Promise<TaxRate>;

  getRate(id: string): Promise<TaxRate>;
  listRates(params?: {
    country?: string;
    state?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ rates: TaxRate[]; total: number }>;
  updateRate(id: string, params: Partial<TaxRateParams>): Promise<TaxRate>;
  deleteRate(id: string): Promise<void>;

  createCategory(params: { name: string; description?: string }): Promise<TaxCategory>;
  getCategory(id: string): Promise<TaxCategory>;
  listCategories(): Promise<TaxCategory[]>;
  deleteCategory(id: string): Promise<void>;

  createExemption(params: {
    customerId: string;
    type?: TaxExemptionType;
    categoryId?: string;
    taxIdNumber?: string;
    reason?: string;
    expiresAt?: Date;
  }): Promise<TaxExemption>;
  getExemption(id: string): Promise<TaxExemption>;
  listExemptions(customerId: string): Promise<TaxExemption[]>;
  deleteExemption(id: string): Promise<void>;

  calculate(params: {
    address: TaxAddress;
    lineItems: Array<{ productId: string; amount: number; quantity: number; categoryId?: string }>;
    shippingAmount?: number;
    customerId?: string;
  }): Promise<TaxCalculation>;

  getRatesForAddress(address: TaxAddress): Promise<TaxRate[]>;
}
```

## Types

```ts
type TaxRateType = "percentage" | "fixed";
type TaxExemptionType = "full" | "category";

interface TaxAddress {
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
}

interface TaxCalculation {
  totalTax: number;
  shippingTax: number;
  lines: TaxLineResult[];
  effectiveRate: number;
  inclusive: boolean;
  jurisdiction: string;
}

interface TaxLineResult {
  productId: string;
  taxableAmount: number;
  taxAmount: number;
  rate: number;
  rateNames: string[];
}
```

## Store Components

### TaxEstimate

Displays applicable tax rates for a given address. Useful on product pages or cart summary.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `country` | `string` | Country code |
| `state` | `string` | State/region |
| `city` | `string` | Optional city |
| `postalCode` | `string` | Optional postal code |

#### Usage in MDX

```mdx
<TaxEstimate country="US" state="CA" />
```

### TaxBreakdown

Displays a detailed tax breakdown for a completed calculation. Used in checkout summary and order receipts.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `calculation` | `TaxCalculation` | Tax calculation result with totalTax, shippingTax, effectiveRate, inclusive |

#### Usage in MDX

```mdx
<TaxBreakdown calculation={taxCalculation} />
```
