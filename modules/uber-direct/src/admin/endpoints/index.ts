import type { createGetSettingsEndpoint } from "./get-settings";
import { listDeliveries } from "./list-deliveries";
import { listQuotes } from "./list-quotes";
import { getDeliveryStats } from "./stats";
import { updateDeliveryStatus } from "./update-delivery-status";

export function createAdminEndpointsWithSettings(
	settingsEndpoint: ReturnType<typeof createGetSettingsEndpoint>,
) {
	return {
		"/admin/uber-direct/deliveries": listDeliveries,
		"/admin/uber-direct/deliveries/:id/status": updateDeliveryStatus,
		"/admin/uber-direct/quotes": listQuotes,
		"/admin/uber-direct/stats": getDeliveryStats,
		"/admin/uber-direct/settings": settingsEndpoint,
	};
}
