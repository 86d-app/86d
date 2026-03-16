import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { etsySchema } from "./schema";
import { createEtsyController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	ChannelStats,
	EtsyController,
	EtsyListing,
	EtsyOrder,
	EtsyReview,
} from "./service";

export interface EtsyOptions extends ModuleConfig {
	/** Etsy API key */
	apiKey?: string;
	/** Etsy Shop ID */
	shopId?: string;
	/** Etsy access token */
	accessToken?: string;
}

export default function etsy(options?: EtsyOptions): Module {
	return {
		id: "etsy",
		version: "0.1.0",
		schema: etsySchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingPrice", "listingViews"],
		},
		events: {
			emits: [
				"etsy.listing.synced",
				"etsy.listing.expired",
				"etsy.order.received",
				"etsy.order.shipped",
				"etsy.review.received",
				"etsy.catalog.synced",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createEtsyController(ctx.data);
			return { controllers: { etsy: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/etsy",
					component: "EtsyAdmin",
					label: "Etsy",
					icon: "Palette",
					group: "Sales",
				},
			],
		},
		options,
	};
}
