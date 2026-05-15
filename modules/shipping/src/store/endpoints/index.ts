import { calculateRates } from "./calculate-rates";
import { listCarriers } from "./list-carriers";
import { listMethods } from "./list-methods";
import { liveRatesEndpoint } from "./live-rates";
import { purchaseLabelEndpoint } from "./purchase-label";
import { trackShipment } from "./track-shipment";
import { createShippingWebhook } from "./webhook";

export function createStoreEndpointsWithRates(opts?: {
	webhookSecret?: string | undefined;
}) {
	return {
		...storeEndpoints,
		"/shipping/live-rates": liveRatesEndpoint,
		"/shipping/purchase-label": purchaseLabelEndpoint,
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
