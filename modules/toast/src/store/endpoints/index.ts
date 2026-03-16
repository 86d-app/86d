import { syncMenuEndpoint } from "./sync-menu";
import { syncOrderEndpoint } from "./sync-order";

export const storeEndpoints = {
	"/toast/sync/menu": syncMenuEndpoint,
	"/toast/sync/order": syncOrderEndpoint,
};
