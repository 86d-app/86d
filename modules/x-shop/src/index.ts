import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { xShopSchema } from "./schema";
import { createXShopController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	ChannelOrder,
	ChannelStats,
	DropStats,
	Listing,
	ProductDrop,
	XShopController,
} from "./service";

export interface XShopOptions extends ModuleConfig {
	/** X/Twitter API key */
	apiKey?: string;
	/** X/Twitter API secret */
	apiSecret?: string;
	/** X Commerce merchant ID */
	merchantId?: string;
}

export default function xShop(options?: XShopOptions): Module {
	return {
		id: "x-shop",
		version: "0.1.0",
		schema: xShopSchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingSyncStatus"],
		},
		events: {
			emits: [
				"x.product.listed",
				"x.product.unlisted",
				"x.order.received",
				"x.drop.launched",
				"x.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createXShopController(ctx.data);
			return { controllers: { xShop: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/x-shop",
					component: "XShopAdmin",
					label: "X Shop",
					icon: "MessageSquare",
					group: "Sales",
				},
			],
		},
		options,
	};
}
