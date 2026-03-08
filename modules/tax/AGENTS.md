# Tax Module

Jurisdiction-based tax calculation engine with support for categories, exemptions, compound rates, and rate stacking.

## Structure

```
src/
  index.ts          Factory: tax(options?) => Module
  schema.ts         Data models: taxRate, taxCategory, taxExemption
  service.ts        TaxController interface + all type exports
  service-impl.ts   TaxController implementation + matchScore/applyRates helpers
  store/
    components/     Store-facing MDX + TSX (breakdown, estimate)
    endpoints/
      calculate-tax.ts    POST /tax/calculate
      get-rates.ts        GET  /tax/rates
  admin/
    components/     Admin MDX + TSX (rates management)
    endpoints/
      list-rates.ts              GET    /admin/tax/rates
      create-rate.ts             POST   /admin/tax/rates/create
      get-rate.ts                GET    /admin/tax/rates/:id
      update-rate.ts             PUT    /admin/tax/rates/:id/update
      delete-rate.ts             DELETE /admin/tax/rates/:id/delete
      list-categories.ts         GET    /admin/tax/categories
      create-category.ts         POST   /admin/tax/categories/create
      delete-category.ts         DELETE /admin/tax/categories/:id/delete
      list-exemptions.ts         GET    /admin/tax/exemptions
      create-exemption.ts        POST   /admin/tax/exemptions/create
      delete-exemption.ts        DELETE /admin/tax/exemptions/:id/delete
```

## Options

```ts
TaxOptions {
  taxShipping?: boolean  // default false
}
```

## Data models

- **taxRate**: id, name, country, state, city, postalCode, rate (decimal), type (percentage|fixed), categoryId, enabled, priority, compound, inclusive
- **taxCategory**: id, name, description?
- **taxExemption**: id, customerId, type (full|category), categoryId?, taxIdNumber?, reason?, expiresAt?, enabled

## Patterns

- Jurisdiction matching uses a scoring system: country=1, +state=10, +city=100, +postal=1000. Higher score wins.
- Category-specific rates take precedence over "default" category rates
- Rates grouped by priority: same-priority rates are additive, compound rates apply to (base + prior tax)
- Customer exemptions: "full" exempts from all tax, "category" exempts from a specific category
- Expired exemptions (expiresAt < now) are filtered out at calculation time
- `roundCurrency()` uses banker's rounding to 2 decimal places
- Shipping is taxed using "default" category rates when `shippingAmount > 0`
