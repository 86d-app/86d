import { acknowledgeOrderEndpoint } from "./acknowledge-order";
import { cancelOrderEndpoint } from "./cancel-order";
import { createItemEndpoint } from "./create-item";
import { getItemEndpoint } from "./get-item";
import { itemHealthEndpoint } from "./item-health";
import { listFeedsEndpoint } from "./list-feeds";
import { listItemsEndpoint } from "./list-items";
import { listOrdersEndpoint } from "./list-orders";
import { retireItemEndpoint } from "./retire-item";
import { shipOrderEndpoint } from "./ship-order";
import { statsEndpoint } from "./stats";
import { submitFeedEndpoint } from "./submit-feed";
import { updateItemEndpoint } from "./update-item";

export const adminEndpoints = {
	"/admin/walmart/items": listItemsEndpoint,
	"/admin/walmart/items/create": createItemEndpoint,
	"/admin/walmart/items/health": itemHealthEndpoint,
	"/admin/walmart/items/:id": getItemEndpoint,
	"/admin/walmart/items/:id/update": updateItemEndpoint,
	"/admin/walmart/items/:id/retire": retireItemEndpoint,
	"/admin/walmart/orders": listOrdersEndpoint,
	"/admin/walmart/orders/:id/acknowledge": acknowledgeOrderEndpoint,
	"/admin/walmart/orders/:id/ship": shipOrderEndpoint,
	"/admin/walmart/orders/:id/cancel": cancelOrderEndpoint,
	"/admin/walmart/feeds": listFeedsEndpoint,
	"/admin/walmart/feeds/submit": submitFeedEndpoint,
	"/admin/walmart/stats": statsEndpoint,
};
