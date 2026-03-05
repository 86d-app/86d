# Shipping Module

Shipping zone and rate management. Supports multi-zone configuration with per-zone rates filtered by order amount and weight. Standalone — no dependencies on other modules.

## Structure

```
src/
  index.ts          Factory: shipping(options?) => Module
  schema.ts         Models: shippingZone, shippingRate
  service.ts        ShippingController interface + types
  service-impl.ts   ShippingController implementation
  endpoints/
    store/          Customer-facing
      calculate-rates.ts    POST /shipping/calculate
    admin/          Protected (store admin only)
      list-zones.ts         GET    /admin/shipping/zones
      create-zone.ts        POST   /admin/shipping/zones/create
      update-zone.ts        PUT    /admin/shipping/zones/:id/update
      delete-zone.ts        DELETE /admin/shipping/zones/:id/delete
      add-rate.ts           POST   /admin/shipping/zones/:id/rates
      update-rate.ts        PUT    /admin/shipping/rates/:id/update
      delete-rate.ts        DELETE /admin/shipping/rates/:id/delete
  __tests__/
    service-impl.test.ts    24 tests
```

## Data models

- **shippingZone**: id, name, countries (string[], ISO 3166-1 alpha-2), isActive, createdAt, updatedAt
- **shippingRate**: id, zoneId (FK), name, price (cents), minOrderAmount?, maxOrderAmount?, minWeight?, maxWeight?, isActive, createdAt, updatedAt
- **CalculatedRate** (return type): rateId, zoneName, rateName, price

## Rate calculation

`calculateRates({ country, orderAmount, weight? })`:
1. Fetch all active zones where `countries` includes the given country OR `countries` is empty (wildcard)
2. For each matched zone, fetch active rates where order amount and weight conditions are satisfied
3. Return applicable rates sorted cheapest first

Country matching:
- Zone with empty `countries: []` = wildcard (matches all destinations / "rest of world")

Rate condition matching (all conditions are optional; if not set, condition is satisfied):
- `minOrderAmount`: orderAmount >= min
- `maxOrderAmount`: orderAmount <= max
- `minWeight`: weight >= min (if weight provided)
- `maxWeight`: weight <= max (if weight provided)

## Exports (for inter-module contracts)

Types exported: `ShippingZone`, `ShippingRate`, `CalculatedRate`, `ShippingController`

## Patterns

- `deleteZone` cascades: removes all rates for the zone first, then removes the zone
- `countries` stored as JSON array in the data service
- `exactOptionalPropertyTypes` compatible: all optional params use `T | undefined`
- `findMany` uses spread pattern for optional take/skip
