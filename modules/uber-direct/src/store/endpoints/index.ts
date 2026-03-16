import { createDelivery } from "./create-delivery";
import { getDelivery } from "./get-delivery";
import { requestQuote } from "./request-quote";

export const storeEndpoints = {
	"/uber-direct/quotes": requestQuote,
	"/uber-direct/deliveries": createDelivery,
	"/uber-direct/deliveries/:id": getDelivery,
};
