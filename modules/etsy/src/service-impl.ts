import type { ModuleDataService } from "@86d-app/core";
import type {
	ChannelStats,
	EtsyController,
	EtsyListing,
	EtsyOrder,
	EtsyReview,
} from "./service";

export function createEtsyController(data: ModuleDataService): EtsyController {
	return {
		async createListing(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const listing: EtsyListing = {
				id,
				localProductId: params.localProductId,
				etsyListingId: params.etsyListingId,
				title: params.title,
				description: params.description,
				status: params.status ?? "draft",
				state: params.state ?? "draft",
				price: params.price,
				quantity: params.quantity ?? 0,
				renewalDate: params.renewalDate,
				whoMadeIt: params.whoMadeIt ?? "i-did",
				whenMadeIt: params.whenMadeIt ?? "made_to_order",
				isSupply: params.isSupply ?? false,
				materials: params.materials ?? [],
				tags: params.tags ?? [],
				taxonomyId: params.taxonomyId,
				shippingProfileId: params.shippingProfileId,
				views: 0,
				favorites: 0,
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

			const listing = existing as unknown as EtsyListing;
			const now = new Date();

			const updated: EtsyListing = {
				...listing,
				...(params.etsyListingId !== undefined
					? { etsyListingId: params.etsyListingId }
					: {}),
				...(params.title !== undefined ? { title: params.title } : {}),
				...(params.description !== undefined
					? { description: params.description }
					: {}),
				...(params.status !== undefined ? { status: params.status } : {}),
				...(params.state !== undefined ? { state: params.state } : {}),
				...(params.price !== undefined ? { price: params.price } : {}),
				...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
				...(params.renewalDate !== undefined
					? { renewalDate: params.renewalDate }
					: {}),
				...(params.whoMadeIt !== undefined
					? { whoMadeIt: params.whoMadeIt }
					: {}),
				...(params.whenMadeIt !== undefined
					? { whenMadeIt: params.whenMadeIt }
					: {}),
				...(params.isSupply !== undefined ? { isSupply: params.isSupply } : {}),
				...(params.materials !== undefined
					? { materials: params.materials }
					: {}),
				...(params.tags !== undefined ? { tags: params.tags } : {}),
				...(params.taxonomyId !== undefined
					? { taxonomyId: params.taxonomyId }
					: {}),
				...(params.shippingProfileId !== undefined
					? { shippingProfileId: params.shippingProfileId }
					: {}),
				...(params.error !== undefined ? { error: params.error } : {}),
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
			return raw as unknown as EtsyListing;
		},

		async getListingByProduct(productId) {
			const matches = await data.findMany("listing", {
				where: { localProductId: productId },
				take: 1,
			});
			return (matches[0] as unknown as EtsyListing) ?? null;
		},

		async listListings(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("listing", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as EtsyListing[];
		},

		async renewListing(id) {
			const existing = await data.get("listing", id);
			if (!existing) return null;

			const listing = existing as unknown as EtsyListing;
			const now = new Date();
			const renewalDate = new Date(now);
			renewalDate.setDate(renewalDate.getDate() + 120);

			const updated: EtsyListing = {
				...listing,
				status: "active",
				state: "active",
				renewalDate,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("listing", id, updated as Record<string, any>);
			return updated;
		},

		async receiveOrder(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const order: EtsyOrder = {
				id,
				etsyReceiptId: params.etsyReceiptId,
				status: params.status ?? "open",
				items: params.items,
				subtotal: params.subtotal,
				shippingCost: params.shippingCost,
				etsyFee: params.etsyFee,
				processingFee: params.processingFee,
				tax: params.tax,
				total: params.total,
				buyerName: params.buyerName,
				buyerEmail: params.buyerEmail,
				shippingAddress: params.shippingAddress,
				giftMessage: params.giftMessage,
				createdAt: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("etsyOrder", id, order as Record<string, any>);
			return order;
		},

		async getOrder(id) {
			const raw = await data.get("etsyOrder", id);
			if (!raw) return null;
			return raw as unknown as EtsyOrder;
		},

		async shipOrder(id, trackingNumber, carrier) {
			const existing = await data.get("etsyOrder", id);
			if (!existing) return null;

			const order = existing as unknown as EtsyOrder;
			const now = new Date();

			const updated: EtsyOrder = {
				...order,
				status: "shipped",
				trackingNumber,
				carrier,
				shipDate: now,
				updatedAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("etsyOrder", id, updated as Record<string, any>);
			return updated;
		},

		async listOrders(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.status) where.status = params.status;

			const all = await data.findMany("etsyOrder", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as EtsyOrder[];
		},

		async receiveReview(params) {
			const now = new Date();
			const id = crypto.randomUUID();

			const review: EtsyReview = {
				id,
				etsyTransactionId: params.etsyTransactionId,
				rating: params.rating,
				review: params.review,
				buyerName: params.buyerName,
				listingId: params.listingId,
				createdAt: now,
			};

			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("etsyReview", id, review as Record<string, any>);
			return review;
		},

		async listReviews(params) {
			const all = await data.findMany("etsyReview", {
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
				orderBy: { createdAt: "desc" },
			});
			return all as unknown as EtsyReview[];
		},

		async getAverageRating() {
			const all = await data.findMany("etsyReview", {});
			const reviews = all as unknown as EtsyReview[];
			if (reviews.length === 0) return 0;
			const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
			return Math.round((sum / reviews.length) * 100) / 100;
		},

		async getChannelStats() {
			const allListings = await data.findMany("listing", {});
			const listings = allListings as unknown as EtsyListing[];

			const allOrders = await data.findMany("etsyOrder", {});
			const orders = allOrders as unknown as EtsyOrder[];

			const allReviews = await data.findMany("etsyReview", {});
			const reviews = allReviews as unknown as EtsyReview[];

			const avgRating =
				reviews.length > 0
					? Math.round(
							(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) *
								100,
						) / 100
					: 0;

			const stats: ChannelStats = {
				totalListings: listings.length,
				active: listings.filter((l) => l.status === "active").length,
				draft: listings.filter((l) => l.status === "draft").length,
				expired: listings.filter((l) => l.status === "expired").length,
				inactive: listings.filter((l) => l.status === "inactive").length,
				soldOut: listings.filter((l) => l.status === "sold-out").length,
				totalOrders: orders.length,
				totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
				totalViews: listings.reduce((sum, l) => sum + l.views, 0),
				totalFavorites: listings.reduce((sum, l) => sum + l.favorites, 0),
				averageRating: avgRating,
				totalReviews: reviews.length,
			};

			return stats;
		},

		async getExpiringListings(daysAhead) {
			const allListings = await data.findMany("listing", {});
			const listings = allListings as unknown as EtsyListing[];

			const now = new Date();
			const cutoff = new Date(now);
			cutoff.setDate(cutoff.getDate() + daysAhead);

			return listings.filter(
				(l) =>
					l.renewalDate &&
					new Date(l.renewalDate) <= cutoff &&
					new Date(l.renewalDate) >= now &&
					l.status === "active",
			);
		},
	};
}
