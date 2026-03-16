import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { uberDirectSchema } from "./schema";
import { createUberDirectController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Delivery,
	DeliveryStats,
	Quote,
	UberDirectController,
} from "./service";

export interface UberDirectOptions extends ModuleConfig {
	/** Uber Direct client ID */
	clientId?: string;
	/** Uber Direct client secret */
	clientSecret?: string;
	/** Uber Direct customer ID */
	customerId?: string;
	/** Whether to use sandbox mode (default: "true") */
	sandbox?: string;
}

export default function uberDirect(options?: UberDirectOptions): Module {
	return {
		id: "uber-direct",
		version: "0.1.0",
		schema: uberDirectSchema,
		exports: {
			read: ["deliveryStatus", "deliveryTracking"],
		},
		events: {
			emits: [
				"uber-direct.delivery.created",
				"uber-direct.delivery.picked-up",
				"uber-direct.delivery.delivered",
				"uber-direct.delivery.cancelled",
				"uber-direct.quote.created",
				"uber-direct.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createUberDirectController(ctx.data);
			return { controllers: { uberDirect: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/uber-direct",
					component: "UberDirectAdmin",
					label: "Uber Direct",
					icon: "Truck",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
