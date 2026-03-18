import { createDelivery } from "./create-delivery";
import { getDelivery } from "./get-delivery";
import { requestQuote } from "./request-quote";
import type { createUberDirectWebhook } from "./webhook";

export function createStoreEndpoints(
	webhookEndpoint: ReturnType<typeof createUberDirectWebhook>,
) {
	return {
		"/uber-direct/quotes": requestQuote,
		"/uber-direct/deliveries": createDelivery,
		"/uber-direct/deliveries/:id": getDelivery,
		"/uber-direct/webhook": webhookEndpoint,
	};
}

// No-credentials mode: omit quote and delivery-creation endpoints that require
// the Uber Direct API provider. Only expose read access for existing deliveries.
export const storeEndpoints = {
	"/uber-direct/deliveries/:id": getDelivery,
};
