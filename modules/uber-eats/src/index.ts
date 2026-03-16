import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { uberEatsSchema } from "./schema";
import { createUberEatsController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	MenuSync,
	MenuSyncStatus,
	OrderStats,
	UberEatsController,
	UberOrder,
	UberOrderStatus,
} from "./service";

export interface UberEatsOptions extends ModuleConfig {
	/** Uber Eats client ID */
	clientId?: string;
	/** Uber Eats client secret */
	clientSecret?: string;
	/** Uber Eats restaurant ID */
	restaurantId?: string;
	/** Use sandbox mode (default: "true") */
	sandbox?: string;
}

export default function uberEats(options?: UberEatsOptions): Module {
	return {
		id: "uber-eats",
		version: "0.0.1",
		schema: uberEatsSchema,
		exports: {
			read: ["uberOrderStatus", "uberOrderTotal"],
		},
		events: {
			emits: [
				"ubereats.order.received",
				"ubereats.order.accepted",
				"ubereats.order.ready",
				"ubereats.order.cancelled",
				"ubereats.menu.synced",
				"ubereats.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createUberEatsController(ctx.data, ctx.events);
			return { controllers: { "uber-eats": controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/uber-eats",
					component: "UberEatsAdmin",
					label: "Uber Eats",
					icon: "Bike",
					group: "Sales",
				},
			],
		},
		options,
	};
}
