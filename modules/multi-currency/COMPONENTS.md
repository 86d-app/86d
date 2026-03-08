# Multi-Currency Module — Store Components

This module has no customer-facing store components.

Currency conversion is provided through backend APIs (`/store/convert-price`, `/store/list-currencies`, `/store/get-product-price`) and read exports (`currencyCode`, `exchangeRate`, `formattedPrice`, `convertedAmount`) that can be consumed by MDX templates or other modules. Exchange rate management and currency configuration are handled through the admin interface (`/admin/currencies`).
