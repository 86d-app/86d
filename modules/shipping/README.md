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

# Shipping Module

Shipping zone and rate management for the 86d commerce platform. Supports multi-zone configuration with per-zone rates filtered by order amount and weight.

![version](https://img.shields.io/badge/version-0.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## Installation

```sh
npm install @86d-app/shipping
```

## Usage

```ts
import shipping from "@86d-app/shipping";
import { createModuleClient } from "@86d-app/core";

const client = createModuleClient([
  shipping({
    currency: "USD",
  }),
]);
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `currency` | `string` | `undefined` | Default currency for shipping prices |

## Store Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/shipping/calculate` | Calculate applicable rates for a destination and order |

Request body: `{ country: string, orderAmount: number, weight?: number }`

## Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/shipping/zones` | List all shipping zones |
| `POST` | `/admin/shipping/zones/create` | Create a new shipping zone |
| `PUT` | `/admin/shipping/zones/:id/update` | Update a shipping zone |
| `DELETE` | `/admin/shipping/zones/:id/delete` | Delete a zone and all its rates |
| `GET` | `/admin/shipping/zones/:id/rates` | List rates for a zone |
| `POST` | `/admin/shipping/zones/:id/rates/add` | Add a rate to a zone |
| `PUT` | `/admin/shipping/rates/:id/update` | Update a shipping rate |
| `DELETE` | `/admin/shipping/rates/:id/delete` | Delete a shipping rate |

## Rate Calculation

`calculateRates` matches zones by country code, then filters each zone's rates by order amount and weight constraints:

1. Zones with an empty `countries: []` array match all destinations (wildcard / "rest of world").
2. Rate conditions are optional — if not set, the condition is always satisfied.
3. Results are sorted cheapest first.

```ts
const rates = await controller.calculateRates({
  country: "US",
  orderAmount: 5000, // in cents
  weight: 1.2,       // optional, in your chosen unit
});
// => [{ rateId, zoneName, rateName, price }, ...]
```

## Controller API

```ts
// ── Zones ──────────────────────────────────────────────────────────────

controller.createZone(params: {
  name: string;
  countries?: string[]; // ISO 3166-1 alpha-2 codes; empty = wildcard
  isActive?: boolean;
}): Promise<ShippingZone>

controller.getZone(id: string): Promise<ShippingZone | null>

controller.listZones(params?: {
  activeOnly?: boolean;
}): Promise<ShippingZone[]>

controller.updateZone(id: string, params: {
  name?: string;
  countries?: string[];
  isActive?: boolean;
}): Promise<ShippingZone | null>

// Cascades: removes all rates for the zone before deleting it
controller.deleteZone(id: string): Promise<boolean>

// ── Rates ──────────────────────────────────────────────────────────────

controller.addRate(params: {
  zoneId: string;
  name: string;
  price: number;         // in cents
  minOrderAmount?: number;
  maxOrderAmount?: number;
  minWeight?: number;
  maxWeight?: number;
  isActive?: boolean;
}): Promise<ShippingRate>

controller.getRate(id: string): Promise<ShippingRate | null>

controller.listRates(params: {
  zoneId: string;
  activeOnly?: boolean;
}): Promise<ShippingRate[]>

controller.updateRate(id: string, params: {
  name?: string;
  price?: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  minWeight?: number;
  maxWeight?: number;
  isActive?: boolean;
}): Promise<ShippingRate | null>

controller.deleteRate(id: string): Promise<boolean>

// ── Calculation ─────────────────────────────────────────────────────────

controller.calculateRates(params: {
  country: string;    // ISO 3166-1 alpha-2
  orderAmount: number;
  weight?: number;
}): Promise<CalculatedRate[]>
```

## Example: Multi-zone Setup

```ts
// Domestic zone
const us = await controller.createZone({ name: "United States", countries: ["US"] });
await controller.addRate({ zoneId: us.id, name: "Standard", price: 599 });
await controller.addRate({ zoneId: us.id, name: "Free Shipping", price: 0, minOrderAmount: 5000 });

// International zone
const intl = await controller.createZone({ name: "International", countries: ["GB", "CA", "AU"] });
await controller.addRate({ zoneId: intl.id, name: "International Standard", price: 1499 });

// Wildcard fallback
const rest = await controller.createZone({ name: "Rest of World", countries: [] });
await controller.addRate({ zoneId: rest.id, name: "Global", price: 1999 });
```

## Types

```ts
interface ShippingZone {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 codes; empty array = all countries */
  countries: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  /** Price in cents */
  price: number;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  minWeight?: number;
  maxWeight?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CalculatedRate {
  rateId: string;
  zoneName: string;
  rateName: string;
  price: number;
}
```

## Store Components

### ShippingEstimator

Shipping cost estimator form. Customers select a country and optionally enter an order total to see available shipping rates and prices.

#### Props

None. The component manages its own state and fetches rates via the module client.

#### Usage in MDX

```mdx
<ShippingEstimator />
```

Suitable for product pages, cart pages, or a dedicated shipping info page.

### ShippingOptions

Displays available shipping rates as selectable radio buttons. Auto-fetches rates based on provided country and order amount. Selects the cheapest option by default.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `country` | `string` | Yes | ISO 3166-1 alpha-2 country code |
| `orderAmount` | `number` | Yes | Cart total in cents |
| `weight` | `number` | No | Total weight in grams |
| `onSelect` | `(rate) => void` | No | Callback when a rate is selected |
| `selectedRateId` | `string` | No | Pre-selected rate ID |

#### Usage in MDX

```mdx
<ShippingOptions country="US" orderAmount={5000} onSelect={handleSelect} />
```

Designed for checkout flows where the customer picks a shipping method.

### ShippingRateSummary

Displays a selected shipping method and its cost. Shows a truck icon, rate name, optional zone name, and price. Free shipping is highlighted in green.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `rateName` | `string` | Yes | Name of the selected rate |
| `zoneName` | `string` | No | Name of the shipping zone |
| `price` | `number` | Yes | Price in cents (0 = free) |

#### Usage in MDX

```mdx
<ShippingRateSummary rateName="Standard Shipping" price={599} />
<ShippingRateSummary rateName="Free Shipping" zoneName="Domestic" price={0} />
```

Use in order summaries, confirmation pages, or checkout review steps.
