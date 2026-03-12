import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createBrandController } from "../service-impl";

/**
 * Security regression tests for brands endpoints.
 *
 * Brands are public-read on storefront (no auth for browsing).
 * Security focuses on:
 * - Only active brands are visible on storefront (getBrandForProduct)
 * - Inactive brands are hidden from store-facing queries
 * - Product assignment is exclusive (one brand per product)
 * - Cascade deletion removes all brand-product associations
 * - Featured brands filter respects isActive
 */

describe("brands endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createBrandController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createBrandController(mockData);
	});

	describe("storefront visibility rules", () => {
		it("inactive brands are hidden from getBrandForProduct", async () => {
			const brand = await controller.createBrand({
				name: "Hidden Brand",
				slug: "hidden-brand",
				isActive: false,
			});
			await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});

			const result = await controller.getBrandForProduct("prod_1");
			expect(result).toBeNull();
		});

		it("active brands are visible from getBrandForProduct", async () => {
			const brand = await controller.createBrand({
				name: "Visible Brand",
				slug: "visible-brand",
				isActive: true,
			});
			await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});

			const result = await controller.getBrandForProduct("prod_1");
			expect(result).not.toBeNull();
			expect(result?.name).toBe("Visible Brand");
		});

		it("deactivating a brand hides it from product lookups", async () => {
			const brand = await controller.createBrand({
				name: "Brand",
				slug: "brand",
				isActive: true,
			});
			await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});

			// Deactivate
			await controller.updateBrand(brand.id, { isActive: false });

			const result = await controller.getBrandForProduct("prod_1");
			expect(result).toBeNull();
		});

		it("featured brands filter respects isActive", async () => {
			await controller.createBrand({
				name: "Active Featured",
				slug: "active-featured",
				isFeatured: true,
				isActive: true,
			});
			await controller.createBrand({
				name: "Inactive Featured",
				slug: "inactive-featured",
				isFeatured: true,
				isActive: false,
			});

			const featured = await controller.getFeaturedBrands();
			expect(featured).toHaveLength(1);
			expect(featured[0].name).toBe("Active Featured");
		});
	});

	describe("product assignment exclusivity", () => {
		it("assigning a product to a new brand removes it from the old brand", async () => {
			const brand1 = await controller.createBrand({
				name: "Brand A",
				slug: "brand-a",
			});
			const brand2 = await controller.createBrand({
				name: "Brand B",
				slug: "brand-b",
			});

			await controller.assignProduct({
				brandId: brand1.id,
				productId: "prod_1",
			});
			await controller.assignProduct({
				brandId: brand2.id,
				productId: "prod_1",
			});

			const brand1Products = await controller.getBrandProducts({
				brandId: brand1.id,
			});
			const brand2Products = await controller.getBrandProducts({
				brandId: brand2.id,
			});

			expect(brand1Products).toHaveLength(0);
			expect(brand2Products).toHaveLength(1);
		});

		it("re-assigning same product to same brand is idempotent", async () => {
			const brand = await controller.createBrand({
				name: "Brand",
				slug: "brand",
			});

			const first = await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});
			const second = await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});

			expect(first.id).toBe(second.id);
			const products = await controller.getBrandProducts({
				brandId: brand.id,
			});
			expect(products).toHaveLength(1);
		});
	});

	describe("cascade deletion", () => {
		it("deleting a brand removes all its product associations", async () => {
			const brand = await controller.createBrand({
				name: "Doomed Brand",
				slug: "doomed-brand",
			});
			await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});
			await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_2",
			});

			await controller.deleteBrand(brand.id);

			// Products should no longer have a brand
			const prod1Brand = await controller.getBrandForProduct("prod_1");
			const prod2Brand = await controller.getBrandForProduct("prod_2");
			expect(prod1Brand).toBeNull();
			expect(prod2Brand).toBeNull();
		});

		it("deleting a brand does not affect other brands' products", async () => {
			const brand1 = await controller.createBrand({
				name: "Brand 1",
				slug: "brand-1",
			});
			const brand2 = await controller.createBrand({
				name: "Brand 2",
				slug: "brand-2",
			});
			await controller.assignProduct({
				brandId: brand1.id,
				productId: "prod_1",
			});
			await controller.assignProduct({
				brandId: brand2.id,
				productId: "prod_2",
			});

			await controller.deleteBrand(brand1.id);

			const brand2Products = await controller.getBrandProducts({
				brandId: brand2.id,
			});
			expect(brand2Products).toHaveLength(1);
		});

		it("deleting a non-existent brand returns false", async () => {
			const result = await controller.deleteBrand("nonexistent");
			expect(result).toBe(false);
		});
	});

	describe("bulk assignment safety", () => {
		it("bulkAssignProducts moves products from other brands", async () => {
			const brand1 = await controller.createBrand({
				name: "Old Brand",
				slug: "old-brand",
			});
			const brand2 = await controller.createBrand({
				name: "New Brand",
				slug: "new-brand",
			});

			await controller.assignProduct({
				brandId: brand1.id,
				productId: "prod_1",
			});

			const assigned = await controller.bulkAssignProducts({
				brandId: brand2.id,
				productIds: ["prod_1", "prod_2"],
			});
			expect(assigned).toBe(2);

			const brand1Count = await controller.countBrandProducts(brand1.id);
			expect(brand1Count).toBe(0);
		});

		it("bulkAssignProducts skips already-assigned products", async () => {
			const brand = await controller.createBrand({
				name: "Brand",
				slug: "brand",
			});
			await controller.assignProduct({
				brandId: brand.id,
				productId: "prod_1",
			});

			const assigned = await controller.bulkAssignProducts({
				brandId: brand.id,
				productIds: ["prod_1", "prod_2"],
			});
			expect(assigned).toBe(1); // Only prod_2 was new
		});
	});

	describe("unassign safety", () => {
		it("unassigning a non-existent product returns false", async () => {
			const brand = await controller.createBrand({
				name: "Brand",
				slug: "brand",
			});
			const result = await controller.unassignProduct({
				brandId: brand.id,
				productId: "nonexistent",
			});
			expect(result).toBe(false);
		});
	});
});
