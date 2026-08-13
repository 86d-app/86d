import { confirmOrder } from "./confirm-order";
import { createMyReturn } from "./create-return";
import {
	cancelMyOrderUnavailable as cancelMyOrder,
	getMyInvoiceUnavailable as getMyInvoice,
	getMyOrderUnavailable as getMyOrder,
	getMyOrderFulfillmentsUnavailable as getMyOrderFulfillments,
	getMyOrderReturnsUnavailable as getMyOrderReturns,
	listMyOrdersUnavailable as listMyOrders,
	listMyReturnsUnavailable as listMyReturns,
	reorderUnavailable as reorder,
} from "./customer-continuity-unavailable";
import { storeSearch } from "./store-search";
import { trackOrder } from "./track-order";

export const storeEndpoints = {
	"/orders/store-search": storeSearch,
	"/orders/track": trackOrder,
	"/orders/confirm": confirmOrder,
	"/orders/me": listMyOrders,
	"/orders/me/returns": listMyReturns,
	"/orders/me/:id": getMyOrder,
	"/orders/me/:id/cancel": cancelMyOrder,
	"/orders/me/:id/invoice": getMyInvoice,
	"/orders/me/:id/reorder": reorder,
	"/orders/me/:id/fulfillments": getMyOrderFulfillments,
	"/orders/me/:id/returns": getMyOrderReturns,
	"/orders/me/:id/returns/create": createMyReturn,
};
