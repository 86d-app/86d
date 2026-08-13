import { calculateRates } from "./calculate-rates";
import { listCarriers } from "./list-carriers";
import { listMethods } from "./list-methods";
import { trackShipment } from "./track-shipment";
import { createShippingWebhook } from "./webhook";

export function createStoreEndpointsWithRates(opts?: {
	webhookSecret?: string | undefined;
}) {
	return {
		...storeEndpoints,
		"/shipping/webhook": createShippingWebhook({
			webhookSecret: opts?.webhookSecret,
		}),
	};
}

export const storeEndpoints = {
	"/shipping/calculate": calculateRates,
	"/shipping/methods": listMethods,
	"/shipping/carriers": listCarriers,
	"/shipping/track/:id": trackShipment,
};
