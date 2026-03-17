import { acceptQuoteEndpoint } from "./accept-quote";
import { checkAvailabilityEndpoint } from "./check-availability";
import { createDeliveryEndpoint } from "./create-delivery";
import { getDeliveryEndpoint } from "./get-delivery";
import { requestQuoteEndpoint } from "./request-quote";
import type { createDoordashWebhook } from "./webhook";

export function createStoreEndpoints(
	webhookEndpoint: ReturnType<typeof createDoordashWebhook>,
) {
	return {
		"/doordash/deliveries": createDeliveryEndpoint,
		"/doordash/deliveries/:id": getDeliveryEndpoint,
		"/doordash/availability": checkAvailabilityEndpoint,
		"/doordash/quotes": requestQuoteEndpoint,
		"/doordash/quotes/:id/accept": acceptQuoteEndpoint,
		"/doordash/webhook": webhookEndpoint,
	};
}

// Keep backwards-compatible static export for endpoints that don't need webhook config
export const storeEndpoints = {
	"/doordash/deliveries": createDeliveryEndpoint,
	"/doordash/deliveries/:id": getDeliveryEndpoint,
	"/doordash/availability": checkAvailabilityEndpoint,
	"/doordash/quotes": requestQuoteEndpoint,
	"/doordash/quotes/:id/accept": acceptQuoteEndpoint,
};
