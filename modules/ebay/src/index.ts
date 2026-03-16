import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { ebaySchema } from "./schema";
import { createEbayController } from "./service-impl";

export type {
	ChannelStats,
	EbayController,
	EbayListing,
	EbayOrder,
	EbayOrderStatus,
	ListingCondition,
	ListingStatus,
	ListingType,
} from "./service";

export interface EbayOptions extends ModuleConfig {
	/** eBay API client ID */
	clientId?: string;
	/** eBay API client secret */
	clientSecret?: string;
	/** eBay API refresh token */
	refreshToken?: string;
	/** eBay site ID (default: "EBAY_US") */
	siteId?: string;
}

export default function ebay(options?: EbayOptions): Module {
	return {
		id: "ebay",
		version: "0.1.0",
		schema: ebaySchema,
		exports: {
			read: ["listingTitle", "listingStatus", "listingPrice", "ebayItemId"],
		},
		events: {
			emits: [
				"ebay.listing.created",
				"ebay.listing.ended",
				"ebay.order.received",
				"ebay.order.shipped",
				"ebay.bid.received",
				"ebay.catalog.synced",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createEbayController(ctx.data);
			return { controllers: { ebay: controller } };
		},
		admin: {
			pages: [
				{
					path: "/admin/ebay",
					component: "EbayAdmin",
					label: "eBay",
					icon: "Tag",
					group: "Sales",
				},
			],
		},
		options,
	};
}
