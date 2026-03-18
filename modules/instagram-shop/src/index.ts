import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { createAdminEndpointsWithSettings } from "./admin/endpoints";
import { createGetSettingsEndpoint } from "./admin/endpoints/get-settings";
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
	/** Meta Commerce Manager account ID */
	commerceAccountId?: string;
}

export default function instagramShop(options?: InstagramShopOptions): Module {
	const settingsEndpoint = createGetSettingsEndpoint({
		accessToken: options?.accessToken,
		businessId: options?.businessId,
		catalogId: options?.catalogId,
		commerceAccountId: options?.commerceAccountId,
	});

	return {
		id: "instagram-shop",
		version: "0.2.0",
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
			const controller = createInstagramShopController(ctx.data, ctx.events, {
				accessToken: options?.accessToken,
				catalogId: options?.catalogId,
				commerceAccountId: options?.commerceAccountId,
				businessId: options?.businessId,
			});
			return { controllers: { instagramShop: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: createAdminEndpointsWithSettings(settingsEndpoint),
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
