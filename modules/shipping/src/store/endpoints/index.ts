import { calculateRates } from "./calculate-rates";
import { listCarriers } from "./list-carriers";
import { listMethods } from "./list-methods";
import { liveRatesEndpoint } from "./live-rates";
import { purchaseLabelEndpoint } from "./purchase-label";
import { trackShipment } from "./track-shipment";

export function createStoreEndpointsWithRates() {
	return {
		...storeEndpoints,
		"/shipping/live-rates": liveRatesEndpoint,
		"/shipping/purchase-label": purchaseLabelEndpoint,
	};
}

export const storeEndpoints = {
	"/shipping/calculate": calculateRates,
	"/shipping/methods": listMethods,
	"/shipping/carriers": listCarriers,
	"/shipping/track/:id": trackShipment,
};
