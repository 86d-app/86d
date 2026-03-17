import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { facebookShopSchema } from "./schema";
import { createFacebookShopController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	CatalogSync,
	ChannelOrder,
	ChannelStats,
	Collection,
	FacebookShopController,
	Listing,
} from "./service";

export interface FacebookShopOptions extends ModuleConfig {
	/** Facebook API access token */
	accessToken?: string;
	/** Facebook Page ID */
	pageId?: string;
	/** Facebook catalog ID */
	catalogId?: string;
	/** Meta Commerce Manager account ID */
	commerceAccountId?: string;
}

export default function facebookShop(options?: FacebookShopOptions): Module {
	return {
		id: "facebook-shop",
		version: "0.2.0",
		schema: facebookShopSchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingSyncStatus"],
		},
		events: {
			emits: [
				"facebook.product.synced",
				"facebook.collection.synced",
				"facebook.order.received",
				"facebook.catalog.synced",
				"facebook.webhook.received",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createFacebookShopController(ctx.data, ctx.events, {
				accessToken: options?.accessToken,
				catalogId: options?.catalogId,
				commerceAccountId: options?.commerceAccountId,
			});
			return { controllers: { facebookShop: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/facebook-shop",
					component: "FacebookShopAdmin",
					label: "Facebook Shop",
					icon: "Globe",
					group: "Sales",
				},
			],
		},
		options,
	};
}
