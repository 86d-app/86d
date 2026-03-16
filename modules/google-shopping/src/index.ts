import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { googleShoppingSchema } from "./schema";
import { createGoogleShoppingController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	ChannelOrder,
	ChannelStats,
	FeedDiagnostics,
	FeedSubmission,
	GoogleShoppingController,
	ProductFeedItem,
} from "./service";

export interface GoogleShoppingOptions extends ModuleConfig {
	/** Google Merchant Center ID */
	merchantId?: string;
	/** Google API key */
	apiKey?: string;
	/** Target country code (default: "US") */
	targetCountry?: string;
	/** Content language (default: "en") */
	contentLanguage?: string;
}

export default function googleShopping(
	options?: GoogleShoppingOptions,
): Module {
	return {
		id: "google-shopping",
		version: "0.1.0",
		schema: googleShoppingSchema,
		exports: {
			read: ["feedItemTitle", "feedItemStatus", "feedItemPrice"],
		},
		events: {
			emits: [
				"google.product.synced",
				"google.product.disapproved",
				"google.feed.submitted",
				"google.order.received",
				"google.catalog.synced",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createGoogleShoppingController(ctx.data);
			return { controllers: { "google-shopping": controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/google-shopping",
					component: "GoogleShoppingAdmin",
					label: "Google Shopping",
					icon: "Search",
					group: "Sales",
				},
			],
		},
		options,
	};
}
