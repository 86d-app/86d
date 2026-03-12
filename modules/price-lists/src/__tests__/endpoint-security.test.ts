import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createPriceListController } from "../service-impl";

/**
 * Security regression tests for price-lists endpoints.
 *
 * Price lists have store endpoints (resolve price) and admin CRUD.
 * Security focuses on:
 * - Only active + in-date-range price lists apply to resolution
 * - Inactive/draft/archived price lists are excluded
 * - Customer group scoping restricts which lists are considered
 * - Currency filtering ensures correct price list is matched
 * - Cascade deletion removes all price entries
 * - Priority ordering controls which list wins on conflict
 */

describe("price-lists endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createPriceListController>;

	const past = new Date(Date.now() - 3600_000);
	const future = new Date(Date.now() + 3600_000);

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createPriceListController(mockData);
	});

	describe("price resolution visibility", () => {
		it("inactive price lists are excluded from resolution", async () => {
			const list = await controller.createPriceList({
				name: "Inactive",
				slug: "inactive",
				status: "inactive",
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 500,
			});

			const resolved = await controller.resolvePrice("prod_1", {});
			expect(resolved).toBeNull();
		});

		it("active price lists are included in resolution", async () => {
			const list = await controller.createPriceList({
				name: "Active",
				slug: "active",
				status: "active",
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 500,
			});

			const resolved = await controller.resolvePrice("prod_1", {});
			expect(resolved).not.toBeNull();
			expect(resolved?.price).toBe(500);
		});

		it("expired price lists are excluded from resolution", async () => {
			const list = await controller.createPriceList({
				name: "Expired",
				slug: "expired",
				status: "active",
				startsAt: new Date(Date.now() - 7200_000),
				endsAt: past,
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 500,
			});

			const resolved = await controller.resolvePrice("prod_1", {});
			expect(resolved).toBeNull();
		});

		it("future-scheduled price lists are excluded", async () => {
			const list = await controller.createPriceList({
				name: "Future",
				slug: "future",
				status: "active",
				startsAt: future,
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 500,
			});

			const resolved = await controller.resolvePrice("prod_1", {});
			expect(resolved).toBeNull();
		});
	});

	describe("customer group scoping", () => {
		it("price list with customer group only applies to that group", async () => {
			const list = await controller.createPriceList({
				name: "VIP Pricing",
				slug: "vip-pricing",
				status: "active",
				customerGroupId: "group_vip",
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 400,
			});

			// Without customer group - no match
			const noGroup = await controller.resolvePrice("prod_1", {});
			expect(noGroup).toBeNull();

			// With matching group
			const withGroup = await controller.resolvePrice("prod_1", {
				customerGroupId: "group_vip",
			});
			expect(withGroup?.price).toBe(400);
		});
	});

	describe("cascade deletion", () => {
		it("deleting a price list removes all its entries", async () => {
			const list = await controller.createPriceList({
				name: "Doomed",
				slug: "doomed",
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 500,
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_2",
				price: 600,
			});

			await controller.deletePriceList(list.id);

			const count = await controller.countPrices(list.id);
			expect(count).toBe(0);
		});
	});

	describe("priority ordering", () => {
		it("lowest priority number wins (checked first)", async () => {
			// Priority ascending: 1 is checked first
			const highPriority = await controller.createPriceList({
				name: "High Priority",
				slug: "high",
				status: "active",
				priority: 1,
			});
			await controller.setPrice({
				priceListId: highPriority.id,
				productId: "prod_1",
				price: 900,
			});

			const lowPriority = await controller.createPriceList({
				name: "Low Priority",
				slug: "low",
				status: "active",
				priority: 10,
			});
			await controller.setPrice({
				priceListId: lowPriority.id,
				productId: "prod_1",
				price: 500,
			});

			const resolved = await controller.resolvePrice("prod_1", {});
			// Priority 1 is checked first and wins
			expect(resolved?.price).toBe(900);
			expect(resolved?.priceListName).toBe("High Priority");
		});
	});

	describe("batch resolution", () => {
		it("resolvePrices resolves multiple products at once", async () => {
			const list = await controller.createPriceList({
				name: "Sale",
				slug: "sale",
				status: "active",
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_1",
				price: 500,
			});
			await controller.setPrice({
				priceListId: list.id,
				productId: "prod_2",
				price: 700,
			});

			const resolved = await controller.resolvePrices(
				["prod_1", "prod_2", "prod_3"],
				{},
			);
			// resolvePrices returns Record<string, ResolvedPrice>
			expect(resolved.prod_1?.price).toBe(500);
			expect(resolved.prod_2?.price).toBe(700);
			expect(resolved.prod_3).toBeUndefined();
		});
	});
});
