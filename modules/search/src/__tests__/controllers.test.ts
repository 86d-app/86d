import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createSearchController } from "../service-impl";

describe("search controllers — edge cases", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createSearchController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createSearchController(mockData);
	});

	// ── indexItem — deduplication and metadata ───────────────────────

	describe("indexItem — metadata and deduplication", () => {
		it("stores custom metadata", async () => {
			const item = await controller.indexItem({
				entityType: "product",
				entityId: "prod_m1",
				title: "Widget",
				url: "/products/widget",
				metadata: { price: 1999, currency: "USD" },
			});
			expect(item.metadata).toEqual({ price: 1999, currency: "USD" });
		});

		it("re-indexing preserves same ID", async () => {
			const first = await controller.indexItem({
				entityType: "product",
				entityId: "prod_dup",
				title: "Original",
				url: "/p/orig",
			});
			const second = await controller.indexItem({
				entityType: "product",
				entityId: "prod_dup",
				title: "Updated",
				url: "/p/updated",
			});
			expect(second.id).toBe(first.id);
			expect(second.title).toBe("Updated");
			expect(second.url).toBe("/p/updated");
		});

		it("different entity types with same entityId are separate", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "shared_id",
				title: "Product",
				url: "/p/shared",
			});
			await controller.indexItem({
				entityType: "blog",
				entityId: "shared_id",
				title: "Blog Post",
				url: "/b/shared",
			});
			expect(await controller.getIndexCount()).toBe(2);
		});

		it("stores image URL", async () => {
			const item = await controller.indexItem({
				entityType: "product",
				entityId: "img_prod",
				title: "Photo Widget",
				url: "/products/photo",
				image: "/images/photo.jpg",
			});
			expect(item.image).toBe("/images/photo.jpg");
		});
	});

	// ── search — scoring edge cases ─────────────────────────────────

	describe("search — scoring and ranking", () => {
		beforeEach(async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "exact",
				title: "red",
				body: "A plain item",
				tags: ["simple"],
				url: "/products/exact",
			});
			await controller.indexItem({
				entityType: "product",
				entityId: "prefix",
				title: "red shoes",
				body: "Comfortable shoes in red",
				tags: ["footwear", "red"],
				url: "/products/prefix",
			});
			await controller.indexItem({
				entityType: "product",
				entityId: "body_only",
				title: "Blue Sneakers",
				body: "Available in red and blue",
				tags: ["footwear"],
				url: "/products/body-only",
			});
		});

		it("exact title match scores highest", async () => {
			const { results } = await controller.search("red");
			expect(results.length).toBeGreaterThanOrEqual(2);
			// "red" (exact title match) should score higher than "red shoes" (prefix)
			expect(results[0].item.entityId).toBe("exact");
		});

		it("multi-word queries match across fields", async () => {
			const { results } = await controller.search("red footwear");
			expect(results.length).toBeGreaterThan(0);
			// "red shoes" has "red" in title and "footwear" in tags
			const topIds = results.map((r) => r.item.entityId);
			expect(topIds).toContain("prefix");
		});

		it("non-matching query returns empty", async () => {
			const { results, total } = await controller.search("xyznonexistent123");
			expect(results).toHaveLength(0);
			expect(total).toBe(0);
		});

		it("whitespace-only query returns empty", async () => {
			const { results } = await controller.search("   \t  ");
			expect(results).toHaveLength(0);
		});

		it("hyphenated terms are tokenized", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "hyphen",
				title: "t-shirt",
				url: "/products/t-shirt",
			});
			// Searching "shirt" should match the tokenized "shirt"
			const { results } = await controller.search("shirt");
			const ids = results.map((r) => r.item.entityId);
			expect(ids).toContain("hyphen");
		});

		it("case-insensitive matching", async () => {
			const { results } = await controller.search("RED SHOES");
			expect(results.length).toBeGreaterThan(0);
			const ids = results.map((r) => r.item.entityId);
			expect(ids).toContain("prefix");
		});
	});

	// ── search — entityType filtering ───────────────────────────────

	describe("search — entity type filtering", () => {
		beforeEach(async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Red Widget",
				url: "/p/red",
			});
			await controller.indexItem({
				entityType: "blog",
				entityId: "post_1",
				title: "Red is the New Black",
				url: "/b/red",
			});
			await controller.indexItem({
				entityType: "page",
				entityId: "page_1",
				title: "About Our Red Collection",
				url: "/about/red",
			});
		});

		it("filters to products only", async () => {
			const { results } = await controller.search("red", {
				entityType: "product",
			});
			for (const r of results) {
				expect(r.item.entityType).toBe("product");
			}
			expect(results.length).toBe(1);
		});

		it("filters to blog only", async () => {
			const { results } = await controller.search("red", {
				entityType: "blog",
			});
			expect(results).toHaveLength(1);
			expect(results[0].item.entityType).toBe("blog");
		});

		it("returns all types when no filter", async () => {
			const { results } = await controller.search("red");
			const types = new Set(results.map((r) => r.item.entityType));
			expect(types.size).toBe(3);
		});
	});

	// ── suggest — edge cases ────────────────────────────────────────

	describe("suggest — deduplication and ordering", () => {
		it("deduplicates case variants in suggestions", async () => {
			await controller.recordQuery("Red T-Shirt", 5);
			await controller.recordQuery("red t-shirt", 3);
			await controller.indexItem({
				entityType: "product",
				entityId: "p1",
				title: "red t-shirt",
				url: "/p/red",
			});

			const suggestions = await controller.suggest("red");
			// Should not contain duplicates of the same normalized term
			const normalized = suggestions.map((s) => s.toLowerCase().trim());
			expect(new Set(normalized).size).toBe(normalized.length);
		});

		it("returns title suggestions when no queries match", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "p1",
				title: "Green Hat",
				url: "/p/green",
			});

			const suggestions = await controller.suggest("green");
			expect(suggestions).toHaveLength(1);
			expect(suggestions[0]).toBe("Green Hat");
		});

		it("excludes zero-result queries from suggestions", async () => {
			await controller.recordQuery("red nothing", 0);
			await controller.recordQuery("red shoes", 5);

			const suggestions = await controller.suggest("red");
			expect(suggestions).not.toContain("red nothing");
		});
	});

	// ── getRecentQueries — ordering ─────────────────────────────────

	describe("getRecentQueries — ordering", () => {
		it("returns most recent first", async () => {
			await controller.recordQuery("first", 10, "sess_order");
			await new Promise((r) => setTimeout(r, 5));
			await controller.recordQuery("second", 5, "sess_order");
			await new Promise((r) => setTimeout(r, 5));
			await controller.recordQuery("third", 3, "sess_order");

			const recent = await controller.getRecentQueries("sess_order");
			expect(recent[0].term).toBe("third");
			expect(recent[recent.length - 1].term).toBe("first");
		});

		it("ignores queries from other sessions", async () => {
			await controller.recordQuery("mine", 10, "sess_a");
			await controller.recordQuery("not_mine", 5, "sess_b");

			const recent = await controller.getRecentQueries("sess_a");
			expect(recent).toHaveLength(1);
			expect(recent[0].term).toBe("mine");
		});
	});

	// ── getAnalytics — edge cases ───────────────────────────────────

	describe("getAnalytics — edge cases", () => {
		it("100% zero-result rate when all queries have zero results", async () => {
			await controller.recordQuery("missing1", 0);
			await controller.recordQuery("missing2", 0);
			await controller.recordQuery("missing3", 0);

			const analytics = await controller.getAnalytics();
			expect(analytics.zeroResultRate).toBe(100);
			expect(analytics.avgResultCount).toBe(0);
			expect(analytics.totalQueries).toBe(3);
		});

		it("unique terms count is correct with repeated queries", async () => {
			await controller.recordQuery("shoes", 10);
			await controller.recordQuery("shoes", 8);
			await controller.recordQuery("Shoes", 12); // same normalized term
			await controller.recordQuery("hats", 5);

			const analytics = await controller.getAnalytics();
			expect(analytics.uniqueTerms).toBe(2);
			expect(analytics.totalQueries).toBe(4);
		});
	});

	// ── synonyms — search integration ───────────────────────────────

	describe("synonyms — bidirectional expansion", () => {
		it("searching a synonym finds items indexed with the original term", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "sneaker_1",
				title: "Running Sneakers",
				url: "/products/sneakers",
			});
			await controller.addSynonym("sneaker", ["shoe", "trainer", "footwear"]);

			const { results } = await controller.search("shoe");
			expect(results.length).toBeGreaterThan(0);
		});

		it("searching the original term finds items indexed with synonym text", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "shoe_1",
				title: "Leather Shoe",
				url: "/products/shoe",
			});
			await controller.addSynonym("sneaker", ["shoe", "trainer", "footwear"]);

			const { results } = await controller.search("sneaker");
			const ids = results.map((r) => r.item.entityId);
			expect(ids).toContain("shoe_1");
		});

		it("removing a synonym stops expansion", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "hat_1",
				title: "Fedora Hat",
				url: "/products/fedora",
			});
			const syn = await controller.addSynonym("cap", ["hat", "beanie"]);

			// Before removal — should find via synonym
			const { results: before } = await controller.search("cap");
			expect(before.length).toBeGreaterThan(0);

			// Remove and re-search
			await controller.removeSynonym(syn.id);
			const { results: after } = await controller.search("cap");
			// "cap" no longer expands to "hat"
			expect(after).toHaveLength(0);
		});
	});

	// ── getPopularTerms — tie-breaking ──────────────────────────────

	describe("getPopularTerms — tie-breaking", () => {
		it("terms with equal count are both returned", async () => {
			await controller.recordQuery("shoes", 10);
			await controller.recordQuery("shoes", 8);
			await controller.recordQuery("hats", 5);
			await controller.recordQuery("hats", 3);

			const popular = await controller.getPopularTerms();
			expect(popular).toHaveLength(2);
			expect(popular[0].count).toBe(2);
			expect(popular[1].count).toBe(2);
		});

		it("avgResultCount rounds correctly", async () => {
			await controller.recordQuery("shoes", 10);
			await controller.recordQuery("shoes", 11);

			const popular = await controller.getPopularTerms();
			expect(popular[0].avgResultCount).toBe(11); // Math.round(21/2) = 11
		});
	});

	// ── removeFromIndex — multiple items ────────────────────────────

	describe("removeFromIndex — comprehensive", () => {
		it("removes only the targeted entity, not others of same type", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "keep_me",
				title: "Keeper",
				url: "/p/keep",
			});
			await controller.indexItem({
				entityType: "product",
				entityId: "delete_me",
				title: "Doomed",
				url: "/p/delete",
			});

			await controller.removeFromIndex("product", "delete_me");
			expect(await controller.getIndexCount()).toBe(1);

			const { results } = await controller.search("Keeper");
			expect(results).toHaveLength(1);
		});
	});
});
