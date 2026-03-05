import type { Module, ModuleConfig, ModuleContext } from "@86d-app/core";
import { adminEndpoints } from "./admin/endpoints";
import { wishlistSchema } from "./schema";
import { createWishlistController } from "./service-impl";
import { storeEndpoints } from "./store/endpoints";

export type {
	WishlistController,
	WishlistItem,
	WishlistSummary,
} from "./service";

export interface WishlistOptions extends ModuleConfig {
	/** Maximum items per customer wishlist */
	maxItems?: string;
}

export default function wishlist(options?: WishlistOptions): Module {
	return {
		id: "wishlist",
		version: "0.0.1",
		schema: wishlistSchema,
		exports: {
			read: ["wishlistItemCount", "isInWishlist"],
		},
		events: {
			emits: ["wishlist.itemAdded", "wishlist.itemRemoved"],
		},
		init: async (ctx: ModuleContext) => {
			const controller = createWishlistController(ctx.data);
			return { controllers: { wishlist: controller } };
		},
		search: { store: "/wishlist/store-search" },
		endpoints: {
			store: storeEndpoints,
			admin: adminEndpoints,
		},
		admin: {
			pages: [
				{
					path: "/admin/wishlist",
					component: "WishlistOverview",
					label: "Wishlist",
					icon: "Heart",
					group: "Marketing",
				},
			],
		},
		options,
	};
}
