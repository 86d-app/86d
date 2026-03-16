import type { ModuleDataService } from "@86d-app/core";
import type {
	ChannelStats,
	EbayController,
	EbayListing,
	EbayOrder,
} from "./service";

export function createEbayController(data: ModuleDataService): EbayController {
	return {
		async createListing(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const listing: EbayListing = {
				id,
				localProductId: params.localProductId,
				title: params.title,
				status: "draft",
				listingType: params.listingType ?? "fixed-price",
				price: params.price,
				auctionStartPrice: params.auctionStartPrice,
				currentBid: undefined,
				bidCount: 0,
				quantity: params.quantity ?? 1,
				condition: params.condition ?? "new",
				categoryId: params.categoryId,
				duration: params.duration,
				startTime: undefined,
				endTime: undefined,
				watchers: 0,
				views: 0,
				lastSyncedAt: undefined,
				error: undefined,
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

			const listing = existing as unknown as EbayListing;
			const now = new Date();

			const updated: EbayListing = {
				...listing,
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
				...(params.condition !== undefined
					? { condition: params.condition }
					: {}),
				...(params.categoryId !== undefined
					? { categoryId: params.categoryId }
					: {}),
				...(params.duration !== undefined ? { duration: params.duration } : {}),
				...(params.ebayItemId !== undefined
					? { ebayItemId: params.ebayItemId }
					: {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("listing", id, updated as Record<string, any>);
			return updated;
		},

		async endListing(id) {
			const existing = await data.get("listing", id);
			if (!existing) return null;

			const listing = existing as unknown as EbayListing;
			const now = new Date();

			const updated: EbayListing = {
				...listing,
				status: "ended",
				endTime: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("listing", id, updated as Record<string, any>);
			return updated;
		},

		async getListing(id) {
			const raw = await data.get("listing", id);
			if (!raw) return null;
			return raw as unknown as EbayListing;
		},

		async getListingByProduct(productId) {
			const matches = await data.findMany("listing", {
				where: { localProductId: productId },
				take: 1,
			});
			return (matches[0] as unknown as EbayListing) ?? null;
		},

		async listListings(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;
			if (params?.listingType) where.listingType = params.listingType;

			const all = await data.findMany("listing", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as EbayListing[];
		},

		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const order: EbayOrder = {
				id,
				ebayOrderId: params.ebayOrderId,
				status: "pending",
				items: params.items,
				subtotal: params.subtotal,
				shippingCost: params.shippingCost,
				ebayFee: params.ebayFee,
				paymentProcessingFee: params.paymentProcessingFee,
				total: params.total,
				buyerUsername: params.buyerUsername,
				buyerName: params.buyerName,
				shippingAddress: params.shippingAddress ?? {},
				trackingNumber: undefined,
				carrier: undefined,
				shipDate: undefined,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("ebayOrder", id, order as Record<string, any>);
			return order;
		},

		async getOrder(id) {
			const raw = await data.get("ebayOrder", id);
			if (!raw) return null;
			return raw as unknown as EbayOrder;
		},

		async shipOrder(id, trackingNumber, carrier) {
			const existing = await data.get("ebayOrder", id);
			if (!existing) return null;

			const order = existing as unknown as EbayOrder;
			const now = new Date();

			const updated: EbayOrder = {
				...order,
				status: "shipped",
				trackingNumber,
				carrier,
				shipDate: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("ebayOrder", id, updated as Record<string, any>);
			return updated;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("ebayOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as EbayOrder[];
		},

		async getChannelStats() {
			const allListings = await data.findMany("listing", {});
			const listings = allListings as unknown as EbayListing[];
			const allOrders = await data.findMany("ebayOrder", {});
			const orders = allOrders as unknown as EbayOrder[];

			const activeListings = listings.filter((l) => l.status === "active");
			const activeAuctions = listings.filter(
				(l) => l.status === "active" && l.listingType === "auction",
			);
			const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
			const averagePrice =
				activeListings.length > 0
					? activeListings.reduce((sum, l) => sum + l.price, 0) /
						activeListings.length
					: 0;

			const stats: ChannelStats = {
				totalListings: listings.length,
				activeListings: activeListings.length,
				totalOrders: orders.length,
				totalRevenue,
				activeAuctions: activeAuctions.length,
				averagePrice,
			};

			return stats;
		},

		async getActiveAuctions() {
			const all = await data.findMany("listing", {
				where: { status: "active", listingType: "auction" },
			});
			return all as unknown as EbayListing[];
		},
	};
}
