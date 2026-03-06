import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createSearchController } from "../service-impl";

describe("createSearchController", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createSearchController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createSearchController(mockData);
	});

	// ── indexItem ────────────────────────────────────────────────────────

	describe("indexItem", () => {
		it("indexes a new item", async () => {
			const item = await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Red T-Shirt",
				body: "A comfortable cotton t-shirt in red",
				tags: ["clothing", "t-shirt", "red"],
				url: "/products/red-t-shirt",
				image: "/images/red-tshirt.jpg",
			});
			expect(item.id).toBeDefined();
			expect(item.entityType).toBe("product");
			expect(item.entityId).toBe("prod_1");
			expect(item.title).toBe("Red T-Shirt");
			expect(item.tags).toEqual(["clothing", "t-shirt", "red"]);
			expect(item.indexedAt).toBeInstanceOf(Date);
		});

		it("updates an existing indexed item", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Red T-Shirt",
				url: "/products/red-t-shirt",
			});
			const updated = await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Updated Red T-Shirt",
				url: "/products/red-t-shirt",
			});
			expect(updated.title).toBe("Updated Red T-Shirt");

			const count = await controller.getIndexCount();
			expect(count).toBe(1);
		});

		it("defaults tags and metadata", async () => {
			const item = await controller.indexItem({
				entityType: "blog",
				entityId: "post_1",
				title: "Hello World",
				url: "/blog/hello-world",
			});
			expect(item.tags).toEqual([]);
			expect(item.metadata).toEqual({});
		});
	});

	// ── removeFromIndex ─────────────────────────────────────────────────

	describe("removeFromIndex", () => {
		it("removes an indexed item", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Red T-Shirt",
				url: "/products/red-t-shirt",
			});
			const removed = await controller.removeFromIndex("product", "prod_1");
			expect(removed).toBe(true);
			const count = await controller.getIndexCount();
			expect(count).toBe(0);
		});

		it("returns false for non-existent item", async () => {
			const removed = await controller.removeFromIndex("product", "missing");
			expect(removed).toBe(false);
		});
	});

	// ── search ──────────────────────────────────────────────────────────

	describe("search", () => {
		beforeEach(async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Red T-Shirt",
				body: "Comfortable cotton t-shirt",
				tags: ["clothing", "red"],
				url: "/products/red-t-shirt",
			});
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_2",
				title: "Blue Jeans",
				body: "Classic denim jeans",
				tags: ["clothing", "blue", "denim"],
				url: "/products/blue-jeans",
			});
			await controller.indexItem({
				entityType: "blog",
				entityId: "post_1",
				title: "How to Style T-Shirts",
				body: "Tips for styling your favorite t-shirts",
				tags: ["fashion", "tips"],
				url: "/blog/style-t-shirts",
			});
		});

		it("returns matching results sorted by score", async () => {
			const { results, total } = await controller.search("t-shirt");
			expect(total).toBeGreaterThan(0);
			expect(results[0].item.title).toContain("T-Shirt");
			expect(results[0].score).toBeGreaterThan(0);
		});

		it("returns empty results for non-matching query", async () => {
			const { results, total } = await controller.search("nonexistent");
			expect(results).toHaveLength(0);
			expect(total).toBe(0);
		});

		it("returns empty results for empty query", async () => {
			const { results, total } = await controller.search("  ");
			expect(results).toHaveLength(0);
			expect(total).toBe(0);
		});

		it("filters by entityType", async () => {
			const { results } = await controller.search("t-shirt", {
				entityType: "product",
			});
			for (const r of results) {
				expect(r.item.entityType).toBe("product");
			}
		});

		it("supports pagination with limit and skip", async () => {
			const { results: page1 } = await controller.search("clothing", {
				limit: 1,
				skip: 0,
			});
			const { results: page2 } = await controller.search("clothing", {
				limit: 1,
				skip: 1,
			});
			expect(page1).toHaveLength(1);
			if (page2.length > 0) {
				expect(page1[0].item.id).not.toBe(page2[0].item.id);
			}
		});

		it("matches on tags", async () => {
			const { results } = await controller.search("denim");
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].item.entityId).toBe("prod_2");
		});

		it("matches on body content", async () => {
			const { results } = await controller.search("cotton");
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].item.entityId).toBe("prod_1");
		});

		it("ranks title matches higher than body matches", async () => {
			// "Red T-Shirt" has "red" in title; "Blue Jeans" does not
			const { results } = await controller.search("red");
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].item.entityId).toBe("prod_1");
		});
	});

	// ── synonym expansion ───────────────────────────────────────────────

	describe("search with synonyms", () => {
		beforeEach(async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "T-Shirt",
				url: "/products/t-shirt",
			});
			await controller.addSynonym("tee", ["t-shirt", "tshirt"]);
		});

		it("expands query with synonyms", async () => {
			const { results } = await controller.search("tee");
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].item.entityId).toBe("prod_1");
		});

		it("also expands in reverse (synonym → term)", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_2",
				title: "Tee Collection",
				url: "/products/tee-collection",
			});
			const { results } = await controller.search("tshirt");
			// "tshirt" is a synonym of "tee", so "tee" should also be searched
			expect(results.length).toBeGreaterThan(0);
		});
	});

	// ── suggest ─────────────────────────────────────────────────────────

	describe("suggest", () => {
		beforeEach(async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Red T-Shirt",
				url: "/products/red-t-shirt",
			});
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_2",
				title: "Red Sneakers",
				url: "/products/red-sneakers",
			});
			// Record some queries
			await controller.recordQuery("red t-shirt", 5);
			await controller.recordQuery("red t-shirt", 3);
			await controller.recordQuery("red sneakers", 2);
		});

		it("returns suggestions matching prefix", async () => {
			const suggestions = await controller.suggest("red");
			expect(suggestions.length).toBeGreaterThan(0);
			for (const s of suggestions) {
				expect(s.toLowerCase()).toContain("red");
			}
		});

		it("prioritizes popular queries over title matches", async () => {
			const suggestions = await controller.suggest("red");
			// "red t-shirt" was searched twice, should appear before "red sneakers"
			expect(suggestions[0].toLowerCase()).toContain("red t-shirt");
		});

		it("respects limit", async () => {
			const suggestions = await controller.suggest("red", 1);
			expect(suggestions).toHaveLength(1);
		});

		it("returns empty for empty prefix", async () => {
			const suggestions = await controller.suggest("");
			expect(suggestions).toHaveLength(0);
		});
	});

	// ── recordQuery ─────────────────────────────────────────────────────

	describe("recordQuery", () => {
		it("records a search query", async () => {
			const query = await controller.recordQuery("red shoes", 10, "sess_1");
			expect(query.id).toBeDefined();
			expect(query.term).toBe("red shoes");
			expect(query.normalizedTerm).toBe("red shoes");
			expect(query.resultCount).toBe(10);
			expect(query.sessionId).toBe("sess_1");
			expect(query.searchedAt).toBeInstanceOf(Date);
		});

		it("records without sessionId", async () => {
			const query = await controller.recordQuery("blue hat", 5);
			expect(query.sessionId).toBeUndefined();
		});
	});

	// ── getRecentQueries ────────────────────────────────────────────────

	describe("getRecentQueries", () => {
		it("returns recent queries for a session", async () => {
			await controller.recordQuery("shoes", 10, "sess_1");
			await controller.recordQuery("hats", 5, "sess_1");
			await controller.recordQuery("bags", 3, "sess_2");

			const recent = await controller.getRecentQueries("sess_1");
			expect(recent).toHaveLength(2);
		});

		it("deduplicates by normalized term", async () => {
			await controller.recordQuery("Red Shoes", 10, "sess_1");
			await controller.recordQuery("red shoes", 8, "sess_1");

			const recent = await controller.getRecentQueries("sess_1");
			expect(recent).toHaveLength(1);
		});

		it("respects limit", async () => {
			for (let i = 0; i < 5; i++) {
				await controller.recordQuery(`term_${i}`, i, "sess_1");
			}
			const recent = await controller.getRecentQueries("sess_1", 3);
			expect(recent).toHaveLength(3);
		});

		it("returns empty for unknown session", async () => {
			const recent = await controller.getRecentQueries("unknown");
			expect(recent).toHaveLength(0);
		});
	});

	// ── getPopularTerms ─────────────────────────────────────────────────

	describe("getPopularTerms", () => {
		it("returns terms sorted by frequency", async () => {
			await controller.recordQuery("shoes", 10);
			await controller.recordQuery("shoes", 8);
			await controller.recordQuery("shoes", 12);
			await controller.recordQuery("hats", 5);
			await controller.recordQuery("hats", 3);
			await controller.recordQuery("bags", 1);

			const popular = await controller.getPopularTerms();
			expect(popular[0].term).toBe("shoes");
			expect(popular[0].count).toBe(3);
			expect(popular[0].avgResultCount).toBe(10); // (10+8+12)/3 = 10
			expect(popular[1].term).toBe("hats");
			expect(popular[1].count).toBe(2);
		});

		it("respects limit", async () => {
			for (let i = 0; i < 10; i++) {
				await controller.recordQuery(`term_${i}`, i);
			}
			const popular = await controller.getPopularTerms(5);
			expect(popular).toHaveLength(5);
		});

		it("returns empty when no queries", async () => {
			const popular = await controller.getPopularTerms();
			expect(popular).toHaveLength(0);
		});
	});

	// ── getZeroResultQueries ────────────────────────────────────────────

	describe("getZeroResultQueries", () => {
		it("returns only zero-result queries", async () => {
			await controller.recordQuery("existing", 10);
			await controller.recordQuery("missing", 0);
			await controller.recordQuery("missing", 0);
			await controller.recordQuery("also missing", 0);

			const zero = await controller.getZeroResultQueries();
			expect(zero).toHaveLength(2);
			expect(zero[0].term).toBe("missing");
			expect(zero[0].count).toBe(2);
			expect(zero[0].avgResultCount).toBe(0);
		});

		it("returns empty when all queries have results", async () => {
			await controller.recordQuery("shoes", 10);
			const zero = await controller.getZeroResultQueries();
			expect(zero).toHaveLength(0);
		});
	});

	// ── getAnalytics ────────────────────────────────────────────────────

	describe("getAnalytics", () => {
		it("returns analytics summary", async () => {
			await controller.recordQuery("shoes", 10);
			await controller.recordQuery("shoes", 8);
			await controller.recordQuery("hats", 0);

			const analytics = await controller.getAnalytics();
			expect(analytics.totalQueries).toBe(3);
			expect(analytics.uniqueTerms).toBe(2);
			expect(analytics.avgResultCount).toBe(6); // (10+8+0)/3 = 6
			expect(analytics.zeroResultCount).toBe(1);
			expect(analytics.zeroResultRate).toBe(33); // 1/3 = 33%
		});

		it("returns zeros when no queries", async () => {
			const analytics = await controller.getAnalytics();
			expect(analytics.totalQueries).toBe(0);
			expect(analytics.uniqueTerms).toBe(0);
			expect(analytics.avgResultCount).toBe(0);
			expect(analytics.zeroResultCount).toBe(0);
			expect(analytics.zeroResultRate).toBe(0);
		});
	});

	// ── synonyms ────────────────────────────────────────────────────────

	describe("synonyms", () => {
		it("adds a synonym", async () => {
			const synonym = await controller.addSynonym("tee", ["t-shirt", "tshirt"]);
			expect(synonym.id).toBeDefined();
			expect(synonym.term).toBe("tee");
			expect(synonym.synonyms).toEqual(["t-shirt", "tshirt"]);
			expect(synonym.createdAt).toBeInstanceOf(Date);
		});

		it("updates existing synonym for same term", async () => {
			await controller.addSynonym("tee", ["t-shirt"]);
			const updated = await controller.addSynonym("tee", [
				"t-shirt",
				"tshirt",
				"shirt",
			]);
			expect(updated.synonyms).toEqual(["t-shirt", "tshirt", "shirt"]);

			const all = await controller.listSynonyms();
			expect(all).toHaveLength(1);
		});

		it("removes a synonym", async () => {
			const synonym = await controller.addSynonym("tee", ["t-shirt"]);
			const removed = await controller.removeSynonym(synonym.id);
			expect(removed).toBe(true);

			const all = await controller.listSynonyms();
			expect(all).toHaveLength(0);
		});

		it("returns false when removing non-existent synonym", async () => {
			const removed = await controller.removeSynonym("missing");
			expect(removed).toBe(false);
		});

		it("lists all synonyms", async () => {
			await controller.addSynonym("tee", ["t-shirt"]);
			await controller.addSynonym("sneaker", ["shoe", "trainer"]);

			const all = await controller.listSynonyms();
			expect(all).toHaveLength(2);
		});
	});

	// ── getIndexCount ───────────────────────────────────────────────────

	describe("getIndexCount", () => {
		it("returns 0 when empty", async () => {
			const count = await controller.getIndexCount();
			expect(count).toBe(0);
		});

		it("returns correct count", async () => {
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_1",
				title: "Item 1",
				url: "/1",
			});
			await controller.indexItem({
				entityType: "product",
				entityId: "prod_2",
				title: "Item 2",
				url: "/2",
			});
			const count = await controller.getIndexCount();
			expect(count).toBe(2);
		});
	});
});
