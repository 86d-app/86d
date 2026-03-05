import type { ModuleController } from "@86d-app/core";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Review {
	id: string;
	productId: string;
	customerId?: string | undefined;
	authorName: string;
	authorEmail: string;
	rating: number;
	title?: string | undefined;
	body: string;
	status: ReviewStatus;
	isVerifiedPurchase: boolean;
	helpfulCount: number;
	merchantResponse?: string | undefined;
	merchantResponseAt?: Date | undefined;
	moderationNote?: string | undefined;
	createdAt: Date;
	updatedAt: Date;
}

export interface RatingSummary {
	average: number;
	count: number;
	distribution: Record<string, number>;
}

export interface ReviewController extends ModuleController {
	createReview(params: {
		productId: string;
		authorName: string;
		authorEmail: string;
		rating: number;
		title?: string | undefined;
		body: string;
		customerId?: string | undefined;
		isVerifiedPurchase?: boolean | undefined;
	}): Promise<Review>;

	getReview(id: string): Promise<Review | null>;

	listReviewsByProduct(
		productId: string,
		params?: {
			approvedOnly?: boolean | undefined;
			take?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<Review[]>;

	listReviews(params?: {
		productId?: string | undefined;
		status?: ReviewStatus | undefined;
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<Review[]>;

	updateReviewStatus(
		id: string,
		status: ReviewStatus,
		moderationNote?: string | undefined,
	): Promise<Review | null>;

	deleteReview(id: string): Promise<boolean>;

	getProductRatingSummary(productId: string): Promise<RatingSummary>;

	addMerchantResponse(id: string, response: string): Promise<Review | null>;

	markHelpful(id: string): Promise<Review | null>;

	getReviewAnalytics(): Promise<ReviewAnalytics>;

	createReviewRequest(params: {
		orderId: string;
		orderNumber: string;
		email: string;
		customerName: string;
		items: Array<{ productId: string; name: string }>;
	}): Promise<ReviewRequest>;

	getReviewRequest(orderId: string): Promise<ReviewRequest | null>;

	listReviewRequests(params?: {
		take?: number | undefined;
		skip?: number | undefined;
	}): Promise<ReviewRequest[]>;

	getReviewRequestStats(): Promise<ReviewRequestStats>;

	listReviewsByCustomer(
		customerId: string,
		params?: {
			status?: ReviewStatus | undefined;
			take?: number | undefined;
			skip?: number | undefined;
		},
	): Promise<{ reviews: Review[]; total: number }>;
}

export interface ReviewAnalytics {
	totalReviews: number;
	pendingCount: number;
	approvedCount: number;
	rejectedCount: number;
	averageRating: number;
	ratingsDistribution: Record<string, number>;
	withMerchantResponse: number;
}

export interface ReviewRequest {
	id: string;
	orderId: string;
	orderNumber: string;
	email: string;
	customerName: string;
	items: Array<{ productId: string; name: string }>;
	sentAt: Date;
}

export interface ReviewRequestStats {
	totalSent: number;
	uniqueOrders: number;
}
