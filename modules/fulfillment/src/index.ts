import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { fulfillmentSchema } from "./schema";
import { createFulfillmentController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Fulfillment,
	FulfillmentController,
	FulfillmentItem,
	FulfillmentStatus,
} from "./service";

export interface FulfillmentOptions extends ModuleConfig {
	/** Auto-transition to "shipped" when tracking is added */
	autoShipOnTracking?: boolean;
}

export default function fulfillment(options?: FulfillmentOptions): Module {
	return {
		id: "fulfillment",
		version: "0.0.1",
		schema: fulfillmentSchema,
		requires: {
			orders: { read: ["orderDetails", "orderItems"] },
		},
		events: {
			emits: [
				"fulfillment.created",
				"fulfillment.shipped",
				"fulfillment.delivered",
				"fulfillment.cancelled",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createFulfillmentController(ctx.data);
			return { controllers: { fulfillment: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/fulfillment",
					component: "FulfillmentAdmin",
					label: "Fulfillment",
					icon: "PackageCheck",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
