import type { ModuleDataService } from "@86d-app/core";
import type {
	AmazonController,
	AmazonOrder,
	ChannelStats,
	InventoryHealth,
	InventorySync,
	Listing,
} from "./service";

export function createAmazonController(
	data: ModuleDataService,
): AmazonController {
	return {
		async createListing(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const listing: Listing = {
				id,
				localProductId: params.localProductId,
				asin: params.asin,
				sku: params.sku,
				title: params.title,
				status: params.status ?? "incomplete",
				fulfillmentChannel: params.fulfillmentChannel ?? "FBM",
				price: params.price,
				quantity: params.quantity ?? 0,
				condition: params.condition ?? "new",
				buyBoxOwned: params.buyBoxOwned ?? false,
				error: params.error,
				metadata: params.metadata ?? {},
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("listing", id, listing as Record<string, any>);
			return listing;
		},

		async updateListing(id, params) {
			const existing = await data.get("listing", id);
			if (!existing) return null;

			const listing = existing as unknown as Listing;
			const now = new Date();

			const updated: Listing = {
				...listing,
				...(params.asin !== undefined ? { asin: params.asin } : {}),
				...(params.sku !== undefined ? { sku: params.sku } : {}),
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.fulfillmentChannel !== undefined
					? { fulfillmentChannel: params.fulfillmentChannel }
					: {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
				...(params.condition !== undefined
					? { condition: params.condition }
					: {}),
				...(params.buyBoxOwned !== undefined
					? { buyBoxOwned: params.buyBoxOwned }
					: {}),
				...(params.error !== undefined ? { error: params.error } : {}),
				...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("listing", id, updated as Record<string, any>);
			return updated;
		},

		async deleteListing(id) {
			const existing = await data.get("listing", id);
			if (!existing) return false;
			await data.delete("listing", id);
			return true;
		},

		async getListing(id) {
			const raw = await data.get("listing", id);
			if (!raw) return null;
			return raw as unknown as Listing;
		},

		async getListingByProduct(productId) {
			const matches = await data.findMany("listing", {
				where: { localProductId: productId },
				take: 1,
			});
			return (matches[0] as unknown as Listing) ?? null;
		},

		async getListingByAsin(asin) {
			const matches = await data.findMany("listing", {
				where: { asin },
				take: 1,
			});
			return (matches[0] as unknown as Listing) ?? null;
		},

		async listListings(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.fulfillmentChannel)
				where.fulfillmentChannel = params.fulfillmentChannel;

			const all = await data.findMany("listing", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as Listing[];
		},

		async syncInventory() {
			const now = new Date();
			const id = crypto.randomUUID();

			const allListings = await data.findMany("listing", {});
			const listings = allListings as unknown as Listing[];

			const sync: InventorySync = {
				id,
				status: "pending",
				totalSkus: listings.length,
				updatedSkus: 0,
				failedSkus: 0,
				startedAt: now,
				createdAt: now,
			};

			await data.upsert(
				"inventorySync",
				id,
				// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
				sync as Record<string, any>,
			);
			return sync;
		},

		async getLastInventorySync() {
			const all = await data.findMany("inventorySync", {
				orderBy: { createdAt: "desc" },
				take: 1,
			});
			return (all[0] as unknown as InventorySync) ?? null;
		},

		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const order: AmazonOrder = {
				id,
				amazonOrderId: params.amazonOrderId,
				status: params.status ?? "pending",
				fulfillmentChannel: params.fulfillmentChannel ?? "FBM",
				items: params.items,
				orderTotal: params.orderTotal,
				shippingTotal: params.shippingTotal,
				marketplaceFee: params.marketplaceFee,
				netProceeds: params.netProceeds,
				buyerName: params.buyerName,
				shippingAddress: params.shippingAddress,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("amazonOrder", id, order as Record<string, any>);
			return order;
		},

		async getOrder(id) {
			const raw = await data.get("amazonOrder", id);
			if (!raw) return null;
			return raw as unknown as AmazonOrder;
		},

		async shipOrder(id, trackingNumber, carrier) {
			const existing = await data.get("amazonOrder", id);
			if (!existing) return null;

			const order = existing as unknown as AmazonOrder;
			const now = new Date();

			const updated: AmazonOrder = {
				...order,
				status: "shipped",
				trackingNumber,
				carrier,
				shipDate: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("amazonOrder", id, updated as Record<string, any>);
			return updated;
		},

		async cancelOrder(id) {
			const existing = await data.get("amazonOrder", id);
			if (!existing) return null;

			const order = existing as unknown as AmazonOrder;
			const now = new Date();

			const updated: AmazonOrder = {
				...order,
				status: "cancelled",
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("amazonOrder", id, updated as Record<string, any>);
			return updated;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.fulfillmentChannel)
				where.fulfillmentChannel = params.fulfillmentChannel;

			const all = await data.findMany("amazonOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as AmazonOrder[];
		},

		async getChannelStats() {
			const allListings = await data.findMany("listing", {});
			const listings = allListings as unknown as Listing[];

			const allOrders = await data.findMany("amazonOrder", {});
			const orders = allOrders as unknown as AmazonOrder[];

			const stats: ChannelStats = {
				totalListings: listings.length,
				active: listings.filter((l) => l.status === "active").length,
				inactive: listings.filter((l) => l.status === "inactive").length,
				suppressed: listings.filter((l) => l.status === "suppressed").length,
				incomplete: listings.filter((l) => l.status === "incomplete").length,
				fba: listings.filter((l) => l.fulfillmentChannel === "FBA").length,
				fbm: listings.filter((l) => l.fulfillmentChannel === "FBM").length,
				totalOrders: orders.length,
				totalRevenue: orders.reduce((sum, o) => sum + o.orderTotal, 0),
			};

			return stats;
		},

		async getInventoryHealth() {
			const allListings = await data.findMany("listing", {});
			const listings = allListings as unknown as Listing[];

			const health: InventoryHealth = {
				totalSkus: listings.length,
				lowStock: listings.filter((l) => l.quantity > 0 && l.quantity <= 5)
					.length,
				outOfStock: listings.filter((l) => l.quantity === 0).length,
				fbaCount: listings.filter((l) => l.fulfillmentChannel === "FBA").length,
				fbmCount: listings.filter((l) => l.fulfillmentChannel === "FBM").length,
			};

			return health;
		},
	};
}
