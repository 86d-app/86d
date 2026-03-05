import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { ordersSchema } from "./schema";
import { createOrderController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

// Export types for other modules to use via inter-module contracts
export type {
	AddNoteParams,
	CreateFulfillmentParams,
	CreateOrderParams,
	CreateReturnParams,
	Fulfillment,
	FulfillmentItem,
	FulfillmentStatus,
	FulfillmentWithItems,
	InvoiceData,
	Order,
	OrderAddress,
	OrderController,
	OrderFulfillmentStatus,
	OrderItem,
	OrderNote,
	OrderNoteType,
	OrderStatus,
	OrderWithDetails,
	PaymentStatus,
	ReturnItem,
	ReturnReason,
	ReturnRequest,
	ReturnRequestWithItems,
	ReturnStatus,
	ReturnType,
	UpdateFulfillmentParams,
	UpdateReturnParams,
} from "./service";

export { RETURN_REASONS } from "./service";

export interface OrdersOptions extends ModuleConfig {
	/**
	 * Currency code for orders
	 * @default "USD"
	 */
	currency?: string;
}

/**
 * Orders module factory function.
 * Provides order lifecycle management (pending → processing → completed).
 *
 * Other modules (e.g., checkout) can create orders by importing OrderController
 * through inter-module contracts.
 */
export default function orders(options?: OrdersOptions): Module {
	return {
		id: "orders",
		version: "0.0.1",
		schema: ordersSchema,
		exports: {
			read: [
				"orderNumber",
				"orderStatus",
				"orderTotal",
				"orderPaymentStatus",
				"orderItems",
			],
		},
		events: {
			emits: [
				"order.placed",
				"order.updated",
				"order.fulfilled",
				"order.cancelled",
				"order.shipped",
				"shipment.delivered",
				"return.requested",
				"return.approved",
				"return.rejected",
				"return.refunded",
				"return.completed",
			],
		},

		init: async (ctx: ModuleContext) => {
			const controller = createOrderController(ctx.data);
			return {
				controllers: { order: controller },
			};
		},

		search: { store: "/orders/store-search" },

		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},

		admin: {
			pages: [
				{
					path: "/admin/orders",
					component: "OrderList",
					label: "Orders",
					icon: "ShoppingBag",
					group: "Sales",
				},
				{ path: "/admin/orders/:id", component: "OrderDetail" },
				{ path: "/admin/orders/:id/invoice", component: "OrderInvoice" },
				{ path: "/admin/orders/:id/activity", component: "OrderActivity" },
				{
					path: "/admin/returns",
					component: "ReturnList",
					label: "Returns",
					icon: "ArrowUUpLeft",
					group: "Sales",
				},
			],
		},

		options,
	};
}
