import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createProductFeedsController } from "../service-impl";

/**
 * Security regression tests for product-feeds endpoints.
 *
 * Product feeds are admin-only (no store endpoints).
 * Security focuses on:
 * - Cascade deletion removes feed items and category mappings
 * - Feed creation defaults
 * - Feed status tracking
 * - Category mapping management
 */

describe("product-feeds endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createProductFeedsController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createProductFeedsController(mockData);
	});

	describe("cascade deletion of category mappings", () => {
		it("deleting a feed removes all its category mappings", async () => {
			const feed = await controller.createFeed({
				name: "Google Feed",
				slug: "google-feed",
				channel: "google-shopping",
				format: "xml",
			});

			await controller.addCategoryMapping(feed.id, {
				storeCategory: "Electronics",
				channelCategory: "Electronics > Gadgets",
			});
			await controller.addCategoryMapping(feed.id, {
				storeCategory: "Clothing",
				channelCategory: "Apparel",
			});

			const mappingsBefore = await controller.listCategoryMappings(feed.id);
			expect(mappingsBefore).toHaveLength(2);

			await controller.deleteFeed(feed.id);

			const mappingsAfter = await controller.listCategoryMappings(feed.id);
			expect(mappingsAfter).toHaveLength(0);
		});

		it("deleting a feed does not affect other feeds' mappings", async () => {
			const feed1 = await controller.createFeed({
				name: "Feed 1",
				slug: "feed-1",
				channel: "google-shopping",
				format: "xml",
			});
			const feed2 = await controller.createFeed({
				name: "Feed 2",
				slug: "feed-2",
				channel: "facebook",
				format: "xml",
			});

			await controller.addCategoryMapping(feed1.id, {
				storeCategory: "Electronics",
				channelCategory: "Tech",
			});
			await controller.addCategoryMapping(feed2.id, {
				storeCategory: "Clothing",
				channelCategory: "Apparel",
			});

			await controller.deleteFeed(feed1.id);

			const feed2Mappings = await controller.listCategoryMappings(feed2.id);
			expect(feed2Mappings).toHaveLength(1);
		});
	});

	describe("feed creation defaults", () => {
		it("new feeds start as draft", async () => {
			const feed = await controller.createFeed({
				name: "Draft Feed",
				slug: "draft-feed",
				channel: "google-shopping",
				format: "xml",
			});

			expect(feed.status).toBe("draft");
		});

		it("new feeds have zero counters", async () => {
			const feed = await controller.createFeed({
				name: "New Feed",
				slug: "new-feed",
				channel: "google-shopping",
				format: "xml",
			});

			expect(feed.itemCount).toBe(0);
			expect(feed.errorCount).toBe(0);
			expect(feed.warningCount).toBe(0);
		});

		it("createFeed returns field mappings for known channels", async () => {
			const feed = await controller.createFeed({
				name: "Google Feed",
				slug: "google-feed",
				channel: "google-shopping",
				format: "xml",
			});

			// The returned object (not re-fetched from mock) has mappings
			expect(feed.fieldMappings).toBeDefined();
			expect(Array.isArray(feed.fieldMappings)).toBe(true);
			expect(feed.fieldMappings.length).toBeGreaterThan(0);
		});
	});

	describe("feed retrieval", () => {
		it("getFeed returns null for non-existent feed", async () => {
			const result = await controller.getFeed("nonexistent");
			expect(result).toBeNull();
		});

		it("getFeedBySlug returns null for non-existent slug", async () => {
			const result = await controller.getFeedBySlug("nonexistent");
			expect(result).toBeNull();
		});

		it("getFeed returns feed by ID", async () => {
			const created = await controller.createFeed({
				name: "Test Feed",
				slug: "test-feed",
				channel: "custom",
				format: "json",
			});

			const fetched = await controller.getFeed(created.id);
			expect(fetched).not.toBeNull();
			expect(fetched?.name).toBe("Test Feed");
		});
	});

	describe("category mapping CRUD", () => {
		it("addCategoryMapping creates a mapping", async () => {
			const feed = await controller.createFeed({
				name: "Feed",
				slug: "feed",
				channel: "google-shopping",
				format: "xml",
			});

			const mapping = await controller.addCategoryMapping(feed.id, {
				storeCategory: "Shoes",
				channelCategory: "Footwear",
			});

			expect(mapping.storeCategory).toBe("Shoes");
			expect(mapping.channelCategory).toBe("Footwear");
		});

		it("deleteCategoryMapping removes only that mapping", async () => {
			const feed = await controller.createFeed({
				name: "Feed",
				slug: "feed-2",
				channel: "google-shopping",
				format: "xml",
			});

			const m1 = await controller.addCategoryMapping(feed.id, {
				storeCategory: "A",
				channelCategory: "B",
			});
			await controller.addCategoryMapping(feed.id, {
				storeCategory: "C",
				channelCategory: "D",
			});

			await controller.deleteCategoryMapping(m1.id);

			const remaining = await controller.listCategoryMappings(feed.id);
			expect(remaining).toHaveLength(1);
			expect(remaining[0].storeCategory).toBe("C");
		});
	});

	describe("feed item counting", () => {
		it("countFeedItems returns 0 for feed with no items", async () => {
			const feed = await controller.createFeed({
				name: "Empty",
				slug: "empty",
				channel: "custom",
				format: "json",
			});

			const count = await controller.countFeedItems(feed.id);
			expect(count).toBe(0);
		});
	});
});
