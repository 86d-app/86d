import type { ModuleDataService } from "@86d-app/core";
import type {
	Review,
	ReviewController,
	ReviewRequest,
	ReviewStatus,
} from "./service";

export function createReviewController(
	data: ModuleDataService,
	options?: { autoApprove?: boolean },
): ReviewController {
	return {
		async createReview(params) {
			const id = crypto.randomUUID();
			const now = new Date();
			const status: ReviewStatus =
				options?.autoApprove === true ? "approved" : "pending";
			const review: Review = {
				id,
				productId: params.productId,
				customerId: params.customerId,
				authorName: params.authorName,
				authorEmail: params.authorEmail,
				rating: params.rating,
				title: params.title,
				body: params.body,
				status,
				isVerifiedPurchase: params.isVerifiedPurchase ?? false,
				helpfulCount: 0,
				createdAt: now,
				updatedAt: now,
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("review", id, review as Record<string, any>);
			return review;
		},

		async getReview(id) {
			const raw = await data.get("review", id);
			if (!raw) return null;
			return raw as unknown as Review;
		},

		async listReviewsByProduct(productId, params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = { productId };
			if (params?.approvedOnly) where.status = "approved";

			const all = await data.findMany("review", {
				where,
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as Review[];
		},

		async listReviews(params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = {};
			if (params?.productId) where.productId = params.productId;
			if (params?.status) where.status = params.status;

			const all = await data.findMany("review", {
				...(Object.keys(where).length > 0 ? { where } : {}),
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as Review[];
		},

		async updateReviewStatus(id, status, moderationNote) {
			const existing = await data.get("review", id);
			if (!existing) return null;
			const review = existing as unknown as Review;
			const updated: Review = {
				...review,
				status,
				updatedAt: new Date(),
				...(moderationNote !== undefined ? { moderationNote } : {}),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("review", id, updated as Record<string, any>);
			return updated;
		},

		async deleteReview(id) {
			const existing = await data.get("review", id);
			if (!existing) return false;
			await data.delete("review", id);
			return true;
		},

		async addMerchantResponse(id, response) {
			const existing = await data.get("review", id);
			if (!existing) return null;
			const review = existing as unknown as Review;
			const updated: Review = {
				...review,
				merchantResponse: response,
				merchantResponseAt: new Date(),
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("review", id, updated as Record<string, any>);
			return updated;
		},

		async markHelpful(id) {
			const existing = await data.get("review", id);
			if (!existing) return null;
			const review = existing as unknown as Review;
			const updated: Review = {
				...review,
				helpfulCount: review.helpfulCount + 1,
				updatedAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("review", id, updated as Record<string, any>);
			return updated;
		},

		async getReviewAnalytics() {
			const all = await data.findMany("review", {});
			const reviews = all as unknown as Review[];

			const distribution: Record<string, number> = {
				"1": 0,
				"2": 0,
				"3": 0,
				"4": 0,
				"5": 0,
			};
			let pendingCount = 0;
			let approvedCount = 0;
			let rejectedCount = 0;
			let ratingTotal = 0;
			let withMerchantResponse = 0;

			for (const r of reviews) {
				if (r.status === "pending") pendingCount++;
				else if (r.status === "approved") approvedCount++;
				else if (r.status === "rejected") rejectedCount++;

				ratingTotal += r.rating;
				const key = String(r.rating);
				if (key in distribution) {
					distribution[key] = (distribution[key] ?? 0) + 1;
				}
				if (r.merchantResponse) withMerchantResponse++;
			}

			return {
				totalReviews: reviews.length,
				pendingCount,
				approvedCount,
				rejectedCount,
				averageRating:
					reviews.length > 0
						? Math.round((ratingTotal / reviews.length) * 10) / 10
						: 0,
				ratingsDistribution: distribution,
				withMerchantResponse,
			};
		},

		async getProductRatingSummary(productId) {
			const all = await data.findMany("review", {
				where: { productId, status: "approved" },
			});
			const reviews = all as unknown as Review[];
			if (reviews.length === 0) {
				return {
					average: 0,
					count: 0,
					distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
				};
			}
			const distribution: Record<string, number> = {
				"1": 0,
				"2": 0,
				"3": 0,
				"4": 0,
				"5": 0,
			};
			let total = 0;
			for (const r of reviews) {
				total += r.rating;
				const key = String(r.rating);
				if (key in distribution) {
					distribution[key] = (distribution[key] ?? 0) + 1;
				}
			}
			const average = Math.round((total / reviews.length) * 10) / 10;
			return { average, count: reviews.length, distribution };
		},

		async createReviewRequest(params) {
			const id = crypto.randomUUID();
			const request: ReviewRequest = {
				id,
				orderId: params.orderId,
				orderNumber: params.orderNumber,
				email: params.email,
				customerName: params.customerName,
				items: params.items,
				sentAt: new Date(),
			};
			// biome-ignore lint/suspicious/noExplicitAny: ModuleDataService requires any
			await data.upsert("reviewRequest", id, request as Record<string, any>);
			return request;
		},

		async getReviewRequest(orderId) {
			const all = await data.findMany("reviewRequest", {
				where: { orderId },
				take: 1,
			});
			const requests = all as unknown as ReviewRequest[];
			return requests.length > 0 ? requests[0] : null;
		},

		async listReviewRequests(params) {
			const all = await data.findMany("reviewRequest", {
				...(params?.take !== undefined ? { take: params.take } : {}),
				...(params?.skip !== undefined ? { skip: params.skip } : {}),
			});
			return all as unknown as ReviewRequest[];
		},

		async listReviewsByCustomer(customerId, params) {
			// biome-ignore lint/suspicious/noExplicitAny: JSONB where filter
			const where: Record<string, any> = { customerId };
			if (params?.status) where.status = params.status;

			const all = await data.findMany("review", {
				where,
			});
			const reviews = all as unknown as Review[];

			const filtered = reviews.slice(
				params?.skip ?? 0,
				params?.skip !== undefined && params?.take !== undefined
					? params.skip + params.take
					: params?.take !== undefined
						? params.take
						: undefined,
			);

			return { reviews: filtered, total: reviews.length };
		},

		async getReviewRequestStats() {
			const all = await data.findMany("reviewRequest", {});
			const requests = all as unknown as ReviewRequest[];
			const uniqueOrders = new Set(requests.map((r) => r.orderId));
			return {
				totalSent: requests.length,
				uniqueOrders: uniqueOrders.size,
			};
		},
	};
}
