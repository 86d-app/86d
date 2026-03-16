import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { instagramShopSchema } from "./schema";
import { createInstagramShopController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CatalogSync,
	ChannelOrder,
	ChannelStats,
	InstagramShopController,
	Listing,
} from "./service";

export interface InstagramShopOptions extends ModuleConfig {
	/** Instagram API access token */
	accessToken?: string;
	/** Instagram Business account ID */
	businessId?: string;
	/** Instagram catalog ID */
	catalogId?: string;
}

export default function instagramShop(options?: InstagramShopOptions): Module {
	return {
		id: "instagram-shop",
		version: "0.1.0",
		schema: instagramShopSchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingSyncStatus"],
		},
		events: {
			emits: [
				"instagram.product.synced",
				"instagram.product.tagged",
				"instagram.order.received",
				"instagram.catalog.synced",
				"instagram.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createInstagramShopController(ctx.data);
			return { controllers: { instagramShop: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/instagram-shop",
					component: "InstagramShopAdmin",
					label: "Instagram Shop",
					icon: "Camera",
					group: "Sales",
				},
			],
		},
		options,
	};
}
