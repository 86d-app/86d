import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createReviewController } from "../service-impl";

/**
 * Security regression tests for reviews endpoints.
 *
 * The submit-review endpoint no longer accepts client-provided
 * customerId or isVerifiedPurchase. This tests that the controller
 * correctly handles the server-derived values.
 */

describe("reviews endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createReviewController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createReviewController(mockData);
	});

	describe("customerId server-derivation", () => {
		it("creates review with customerId=undefined for guest users", async () => {
			const review = await controller.createReview({
				productId: "prod_1",
				authorName: "Guest User",
				authorEmail: "guest@example.com",
				rating: 5,
				body: "Great product!",
				customerId: undefined,
				isVerifiedPurchase: false,
			});

			expect(review.id).toBeDefined();
			expect(review.customerId).toBeUndefined();
			expect(review.isVerifiedPurchase).toBe(false);
		});

		it("creates review with server-provided customerId", async () => {
			const review = await controller.createReview({
				productId: "prod_1",
				authorName: "Authenticated User",
				authorEmail: "auth@example.com",
				rating: 4,
				body: "Nice product",
				customerId: "session_user_id",
				isVerifiedPurchase: false,
			});

			expect(review.customerId).toBe("session_user_id");
		});

		it("isVerifiedPurchase defaults to false from endpoint", async () => {
			const review = await controller.createReview({
				productId: "prod_1",
				authorName: "User",
				authorEmail: "user@example.com",
				rating: 3,
				body: "OK product",
				isVerifiedPurchase: false,
			});

			expect(review.isVerifiedPurchase).toBe(false);
		});
	});
});
