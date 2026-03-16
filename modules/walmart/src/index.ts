import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { walmartSchema } from "./schema";
import { createWalmartController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	ChannelStats,
	FeedStatus,
	FeedSubmission,
	FeedType,
	FulfillmentType,
	ItemHealth,
	ItemStatus,
	WalmartController,
	WalmartItem,
	WalmartOrder,
	WalmartOrderStatus,
} from "./service";

export interface WalmartOptions extends ModuleConfig {
	/** Walmart API client ID */
	clientId?: string;
	/** Walmart API client secret */
	clientSecret?: string;
	/** Walmart partner ID */
	partnerId?: string;
}

export default function walmart(options?: WalmartOptions): Module {
	return {
		id: "walmart",
		version: "0.1.0",
		schema: walmartSchema,
		exports: {
			read: ["itemTitle", "itemStatus", "itemPrice", "walmartItemId"],
		},
		events: {
			emits: [
				"walmart.item.synced",
				"walmart.item.retired",
				"walmart.order.received",
				"walmart.order.shipped",
				"walmart.feed.submitted",
				"walmart.inventory.updated",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createWalmartController(ctx.data);
			return { controllers: { walmart: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/walmart",
					component: "WalmartAdmin",
					label: "Walmart",
					icon: "Store",
					group: "Sales",
				},
			],
		},
		options,
	};
}
