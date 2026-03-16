import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { amazonSchema } from "./schema";
import { createAmazonController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	AmazonController,
	AmazonOrder,
	ChannelStats,
	InventoryHealth,
	InventorySync,
	Listing,
} from "./service";

export interface AmazonOptions extends ModuleConfig {
	/** Amazon Seller ID */
	sellerId?: string;
	/** MWS Auth Token */
	mwsAuthToken?: string;
	/** Amazon Marketplace ID */
	marketplaceId?: string;
	/** Amazon region (default: "NA") */
	region?: string;
}

export default function amazon(options?: AmazonOptions): Module {
	return {
		id: "amazon",
		version: "0.1.0",
		schema: amazonSchema,
		exports: {
			read: ["listingTitle", "listingSku", "listingStatus", "listingPrice"],
		},
		events: {
			emits: [
				"amazon.listing.synced",
				"amazon.listing.suppressed",
				"amazon.order.received",
				"amazon.order.shipped",
				"amazon.inventory.updated",
				"amazon.feed.submitted",
			],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createAmazonController(ctx.data);
			return { controllers: { amazon: controller } };
		},
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/amazon",
					component: "AmazonAdmin",
					label: "Amazon",
					icon: "Package",
					group: "Sales",
				},
				{
					path: "/admin/amazon/inventory",
					component: "AmazonInventory",
					label: "Amazon Inventory",
					icon: "Warehouse",
					group: "Sales",
				},
			],
		},
		options,
	};
}
