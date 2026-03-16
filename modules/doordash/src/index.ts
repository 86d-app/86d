import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { doordashSchema } from "./schema";
import { createDoordashController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	Delivery,
	DeliveryAvailability,
	DeliveryStatus,
	DeliveryZone,
	DoordashController,
} from "./service";

export interface DoordashOptions extends ModuleConfig {
	/** DoorDash API key */
	apiKey?: string;
	/** DoorDash business ID */
	businessId?: string;
	/** Use sandbox mode (default: "true") */
	sandbox?: string;
}

export default function doordash(options?: DoordashOptions): Module {
	return {
		id: "doordash",
		version: "0.0.1",
		schema: doordashSchema,
		exports: {
			read: ["deliveryStatus", "deliveryTrackingUrl"],
		},
		events: {
			emits: [
				"doordash.delivery.created",
				"doordash.delivery.picked-up",
				"doordash.delivery.delivered",
				"doordash.delivery.cancelled",
				"doordash.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createDoordashController(ctx.data, ctx.events);
			return { controllers: { doordash: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/doordash",
					component: "DoorDashAdmin",
					label: "DoorDash",
					icon: "Truck",
					group: "Fulfillment",
				},
			],
		},
		options,
	};
}
