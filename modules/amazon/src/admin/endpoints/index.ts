import { cancelOrderEndpoint } from "./cancel-order";
import { createListingEndpoint } from "./create-listing";
import { deleteListingEndpoint } from "./delete-listing";
import { getListingEndpoint } from "./get-listing";
import { inventoryHealthEndpoint } from "./inventory-health";
import { listListingsEndpoint } from "./list-listings";
import { listOrdersEndpoint } from "./list-orders";
import { shipOrderEndpoint } from "./ship-order";
import { statsEndpoint } from "./stats";
import { syncInventoryEndpoint } from "./sync-inventory";
import { updateListingEndpoint } from "./update-listing";

export const adminEndpoints = {
	"/admin/amazon/listings": listListingsEndpoint,
	"/admin/amazon/listings/create": createListingEndpoint,
	"/admin/amazon/listings/:id": getListingEndpoint,
	"/admin/amazon/listings/:id/update": updateListingEndpoint,
	"/admin/amazon/listings/:id/delete": deleteListingEndpoint,
	"/admin/amazon/orders": listOrdersEndpoint,
	"/admin/amazon/orders/:id/ship": shipOrderEndpoint,
	"/admin/amazon/orders/:id/cancel": cancelOrderEndpoint,
	"/admin/amazon/inventory/sync": syncInventoryEndpoint,
	"/admin/amazon/inventory/health": inventoryHealthEndpoint,
	"/admin/amazon/stats": statsEndpoint,
};
