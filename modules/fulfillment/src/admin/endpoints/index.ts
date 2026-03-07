import { addTracking } from "./add-tracking";
import { cancelFulfillment } from "./cancel-fulfillment";
import { createFulfillment } from "./create-fulfillment";
import { getFulfillment } from "./get-fulfillment";
import { listByOrder } from "./list-by-order";
import { listFulfillments } from "./list-fulfillments";
import { updateStatus } from "./update-status";

export const adminEndpoints = {
	"/admin/fulfillment": listFulfillments,
	"/admin/fulfillment/create": createFulfillment,
	"/admin/fulfillment/:id": getFulfillment,
	"/admin/fulfillment/:id/status": updateStatus,
	"/admin/fulfillment/:id/tracking": addTracking,
	"/admin/fulfillment/:id/cancel": cancelFulfillment,
	"/admin/fulfillment/order/:orderId": listByOrder,
};
