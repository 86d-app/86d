import { createServiceArea } from "./create-service-area";
import { listDeliveries } from "./list-deliveries";
import { listServiceAreas } from "./list-service-areas";
import { getFavorStats } from "./stats";
import { updateDeliveryStatus } from "./update-delivery-status";

export const adminEndpoints = {
	"/admin/favor/deliveries": listDeliveries,
	"/admin/favor/deliveries/:id/status": updateDeliveryStatus,
	"/admin/favor/service-areas": listServiceAreas,
	"/admin/favor/service-areas/create": createServiceArea,
	"/admin/favor/stats": getFavorStats,
};
