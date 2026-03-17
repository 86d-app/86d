import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { tiktokShopSchema } from "./schema";
import { createTikTokShopController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CatalogSync,
	ChannelOrder,
	ChannelStats,
	Listing,
	TikTokShopController,
} from "./service";

export interface TikTokShopOptions extends ModuleConfig {
	/** TikTok Shop app key */
	appKey?: string;
	/** TikTok Shop app secret */
	appSecret?: string;
	/** TikTok Shop access token */
	accessToken?: string;
	/** TikTok Shop ID */
	shopId?: string;
	/** Use sandbox environment (default: "true") */
	sandbox?: string;
}

export default function tiktokShop(options?: TikTokShopOptions): Module {
	return {
		id: "tiktok-shop",
		version: "0.2.0",
		schema: tiktokShopSchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingSyncStatus"],
		},
		events: {
			emits: [
				"tiktok.product.synced",
				"tiktok.product.failed",
				"tiktok.order.received",
				"tiktok.order.shipped",
				"tiktok.catalog.synced",
				"tiktok.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createTikTokShopController(ctx.data, ctx.events, {
				appKey: options?.appKey,
				appSecret: options?.appSecret,
				accessToken: options?.accessToken,
				shopId: options?.shopId,
				sandbox: options?.sandbox !== "false",
			});
			return { controllers: { tiktokShop: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/tiktok-shop",
					component: "TikTokShopAdmin",
					label: "TikTok Shop",
					icon: "Video",
					group: "Sales",
				},
			],
		},
		options,
	};
}
