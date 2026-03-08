# Payments Module — Store Components

This module has no customer-facing store components.

Payment UI is provided by the individual payment provider modules (stripe, paypal, square, braintree) which integrate with the checkout flow. The payments module itself is a backend orchestration layer that manages payment intents, methods, and refunds through its controller API.

Admin UI is rendered through the admin endpoint system (`/admin/payments`).
