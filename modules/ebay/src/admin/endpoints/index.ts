import { activeAuctionsEndpoint } from "./active-auctions";
import { createListingEndpoint } from "./create-listing";
import { endListingEndpoint } from "./end-listing";
import { getListingEndpoint } from "./get-listing";
import { listListingsEndpoint } from "./list-listings";
import { listOrdersEndpoint } from "./list-orders";
import { shipOrderEndpoint } from "./ship-order";
import { statsEndpoint } from "./stats";
import { updateListingEndpoint } from "./update-listing";

export const adminEndpoints = {
	"/admin/ebay/listings": listListingsEndpoint,
	"/admin/ebay/listings/create": createListingEndpoint,
	"/admin/ebay/listings/:id": getListingEndpoint,
	"/admin/ebay/listings/:id/update": updateListingEndpoint,
	"/admin/ebay/listings/:id/end": endListingEndpoint,
	"/admin/ebay/orders": listOrdersEndpoint,
	"/admin/ebay/orders/:id/ship": shipOrderEndpoint,
	"/admin/ebay/stats": statsEndpoint,
	"/admin/ebay/auctions": activeAuctionsEndpoint,
};
