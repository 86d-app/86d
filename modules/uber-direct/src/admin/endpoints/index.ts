import { listDeliveries } from "./list-deliveries";
import { listQuotes } from "./list-quotes";
import { getDeliveryStats } from "./stats";
import { updateDeliveryStatus } from "./update-delivery-status";

export const adminEndpoints = {
	"/admin/uber-direct/deliveries": listDeliveries,
	"/admin/uber-direct/deliveries/:id/status": updateDeliveryStatus,
	"/admin/uber-direct/quotes": listQuotes,
	"/admin/uber-direct/stats": getDeliveryStats,
};
