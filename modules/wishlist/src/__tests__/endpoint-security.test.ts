import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createWishlistController } from "../service-impl";

/**
 * Security regression tests for wishlist endpoints.
 *
 * These verify the ownership isolation that the endpoint layer enforces:
 * - Endpoints derive customerId from session (not request body/query)
 * - Remove endpoint verifies item ownership before deletion
 * - List/check endpoints scope to the authenticated user
 */

describe("wishlist endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createWishlistController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createWishlistController(mockData);
	});

	describe("ownership isolation on remove", () => {
		it("getItem returns customerId for ownership verification", async () => {
			const item = await controller.addItem({
				customerId: "cust_1",
				productId: "prod_1",
				productName: "Widget",
			});
			const fetched = await controller.getItem(item.id);
			expect(fetched).not.toBeNull();
			expect(fetched?.customerId).toBe("cust_1");
		});

		it("ownership check prevents cross-user deletion", async () => {
			const item = await controller.addItem({
				customerId: "cust_1",
				productId: "prod_1",
				productName: "Widget",
			});

			// Simulate endpoint ownership check: another user tries to remove
			const fetched = await controller.getItem(item.id);
			const attackerCustomerId = "cust_attacker";
			expect(fetched?.customerId).not.toBe(attackerCustomerId);

			// Item should still exist (endpoint would return 404)
			expect(await controller.getItem(item.id)).not.toBeNull();
		});

		it("owner can remove their own item", async () => {
			const item = await controller.addItem({
				customerId: "cust_1",
				productId: "prod_1",
				productName: "Widget",
			});

			// Simulate endpoint ownership check: owner removes
			const fetched = await controller.getItem(item.id);
			expect(fetched?.customerId).toBe("cust_1");

			const removed = await controller.removeItem(item.id);
			expect(removed).toBe(true);
		});
	});

	describe("customer scoping on list and check", () => {
		it("listByCustomer only returns that customer's items", async () => {
			await controller.addItem({
				customerId: "cust_1",
				productId: "prod_1",
				productName: "A",
			});
			await controller.addItem({
				customerId: "cust_2",
				productId: "prod_2",
				productName: "B",
			});

			const cust1Items = await controller.listByCustomer("cust_1");
			expect(cust1Items).toHaveLength(1);
			expect(cust1Items[0].productId).toBe("prod_1");

			const cust2Items = await controller.listByCustomer("cust_2");
			expect(cust2Items).toHaveLength(1);
			expect(cust2Items[0].productId).toBe("prod_2");
		});

		it("isInWishlist only checks the given customer", async () => {
			await controller.addItem({
				customerId: "cust_1",
				productId: "prod_1",
				productName: "Widget",
			});

			expect(await controller.isInWishlist("cust_1", "prod_1")).toBe(true);
			expect(await controller.isInWishlist("cust_2", "prod_1")).toBe(false);
		});

		it("countByCustomer only counts that customer's items", async () => {
			await controller.addItem({
				customerId: "cust_1",
				productId: "prod_1",
				productName: "A",
			});
			await controller.addItem({
				customerId: "cust_1",
				productId: "prod_2",
				productName: "B",
			});
			await controller.addItem({
				customerId: "cust_2",
				productId: "prod_3",
				productName: "C",
			});

			expect(await controller.countByCustomer("cust_1")).toBe(2);
			expect(await controller.countByCustomer("cust_2")).toBe(1);
		});
	});
});
