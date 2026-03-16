import { checkAvailabilityEndpoint } from "./check-availability";
import { createDeliveryEndpoint } from "./create-delivery";
import { getDeliveryEndpoint } from "./get-delivery";

export const storeEndpoints = {
	"/doordash/deliveries": createDeliveryEndpoint,
	"/doordash/deliveries/:id": getDeliveryEndpoint,
	"/doordash/availability": checkAvailabilityEndpoint,
};
