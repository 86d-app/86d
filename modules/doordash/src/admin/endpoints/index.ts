import { createDeliveryAdminEndpoint } from "./create-delivery";
import { createZoneEndpoint } from "./create-zone";
import { deleteZoneEndpoint } from "./delete-zone";
import { listDeliveriesEndpoint } from "./list-deliveries";
import { listZonesEndpoint } from "./list-zones";
import { updateDeliveryStatusEndpoint } from "./update-delivery-status";
import { updateZoneEndpoint } from "./update-zone";

export const adminEndpoints = {
	"/admin/doordash/deliveries": listDeliveriesEndpoint,
	"/admin/doordash/deliveries/create": createDeliveryAdminEndpoint,
	"/admin/doordash/deliveries/:id/status": updateDeliveryStatusEndpoint,
	"/admin/doordash/zones": listZonesEndpoint,
	"/admin/doordash/zones/create": createZoneEndpoint,
	"/admin/doordash/zones/:id": updateZoneEndpoint,
	"/admin/doordash/zones/:id/delete": deleteZoneEndpoint,
};
