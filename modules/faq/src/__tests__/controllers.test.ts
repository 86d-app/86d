import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createFaqControllers } from "../service-impl";

describe("faq controllers — edge cases", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createFaqControllers>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createFaqControllers(mockData);
	});

	// ── Category edge cases ──────────────────────────────────────────

	describe("category — edge cases", () => {
		it("deleteCategory with no items does not throw", async () => {
			const cat = await controller.createCategory({
				name: "Empty",
				slug: "empty",
			});
			await controller.deleteCategory(cat.id);
			const found = await controller.getCategory(cat.id);
			expect(found).toBeNull();
		});

		it("updateCategory preserves unmodified fields", async () => {
			const cat = await controller.createCategory({
				name: "Original",
				slug: "original",
				description: "Keep me",
				icon: "Star",
				position: 5,
			});

			const updated = await controller.updateCategory(cat.id, {
				name: "Changed",
			});
			expect(updated.name).toBe("Changed");
			expect(updated.slug).toBe("original");
			expect(updated.description).toBe("Keep me");
			expect(updated.icon).toBe("Star");
			expect(updated.position).toBe(5);
		});

		it("creates categories with same position and sorts stably", async () => {
			await controller.createCategory({
				name: "A",
				slug: "a",
				position: 0,
			});
			await controller.createCategory({
				name: "B",
				slug: "b",
				position: 0,
			});

			const cats = await controller.listCategories();
			expect(cats).toHaveLength(2);
		});

		it("listCategories returns empty for no categories", async () => {
			const cats = await controller.listCategories();
			expect(cats).toHaveLength(0);
		});
	});

	// ── Item edge cases ──────────────────────────────────────────────

	describe("item — edge cases", () => {
		it("updateItem preserves unmodified fields", async () => {
			const cat = await controller.createCategory({
				name: "Cat",
				slug: "cat",
			});
			const item = await controller.createItem({
				categoryId: cat.id,
				question: "Original Q?",
				answer: "Original A",
				slug: "original",
				tags: ["keep"],
				position: 3,
			});

			const updated = await controller.updateItem(item.id, {
				question: "New Q?",
			});
			expect(updated.question).toBe("New Q?");
			expect(updated.answer).toBe("Original A");
			expect(updated.slug).toBe("original");
			expect(updated.tags).toEqual(["keep"]);
			expect(updated.position).toBe(3);
		});

		it("moves item between categories", async () => {
			const cat1 = await controller.createCategory({
				name: "Cat1",
				slug: "cat1",
			});
			const cat2 = await controller.createCategory({
				name: "Cat2",
				slug: "cat2",
			});
			const item = await controller.createItem({
				categoryId: cat1.id,
				question: "Movable",
				answer: "A",
				slug: "movable",
			});

			await controller.updateItem(item.id, { categoryId: cat2.id });

			const cat1Items = await controller.listItems({ categoryId: cat1.id });
			const cat2Items = await controller.listItems({ categoryId: cat2.id });
			expect(cat1Items).toHaveLength(0);
			expect(cat2Items).toHaveLength(1);
			expect(cat2Items[0].question).toBe("Movable");
		});

		it("listItems returns empty when no items", async () => {
			const items = await controller.listItems();
			expect(items).toHaveLength(0);
		});

		it("createItem with empty tags array", async () => {
			const cat = await controller.createCategory({
				name: "Cat",
				slug: "cat",
			});
			const item = await controller.createItem({
				categoryId: cat.id,
				question: "Q?",
				answer: "A",
				slug: "q",
				tags: [],
			});
			expect(item.tags).toEqual([]);
		});
	});

	// ── Search edge cases ────────────────────────────────────────────

	describe("search — edge cases", () => {
		let catId: string;

		beforeEach(async () => {
			const cat = await controller.createCategory({
				name: "General",
				slug: "general",
			});
			catId = cat.id;
		});

		it("returns empty for whitespace-only query", async () => {
			await controller.createItem({
				categoryId: catId,
				question: "Something?",
				answer: "Answer",
				slug: "something",
			});
			const results = await controller.search("   ");
			expect(results).toHaveLength(0);
		});

		it("excludes hidden items from search", async () => {
			const item = await controller.createItem({
				categoryId: catId,
				question: "Hidden question?",
				answer: "Hidden answer",
				slug: "hidden",
			});
			await controller.updateItem(item.id, { isVisible: false });

			const results = await controller.search("hidden");
			expect(results).toHaveLength(0);
		});

		it("case-insensitive search", async () => {
			await controller.createItem({
				categoryId: catId,
				question: "How do I RETURN items?",
				answer: "Use the returns page",
				slug: "return",
			});

			const results = await controller.search("return");
			expect(results).toHaveLength(1);
		});

		it("single character words are skipped in word matching", async () => {
			await controller.createItem({
				categoryId: catId,
				question: "How do I get a refund?",
				answer: "Contact support",
				slug: "refund",
			});

			// "I" is a single char, should be skipped, but "refund" should match
			const results = await controller.search("I refund");
			expect(results.length).toBeGreaterThan(0);
		});

		it("search with default limit of 20", async () => {
			for (let i = 0; i < 25; i++) {
				await controller.createItem({
					categoryId: catId,
					question: `Order question ${i}?`,
					answer: `Answer about orders ${i}`,
					slug: `order-${i}`,
				});
			}

			const results = await controller.search("order");
			expect(results.length).toBeLessThanOrEqual(20);
		});
	});

	// ── Vote edge cases ──────────────────────────────────────────────

	describe("vote — edge cases", () => {
		it("multiple votes accumulate independently", async () => {
			const cat = await controller.createCategory({
				name: "Cat",
				slug: "cat",
			});
			const item = await controller.createItem({
				categoryId: cat.id,
				question: "Q?",
				answer: "A",
				slug: "q",
			});

			for (let i = 0; i < 5; i++) {
				await controller.vote(item.id, true);
			}
			for (let i = 0; i < 3; i++) {
				await controller.vote(item.id, false);
			}

			const updated = await controller.getItem(item.id);
			expect(updated?.helpfulCount).toBe(5);
			expect(updated?.notHelpfulCount).toBe(3);
		});
	});

	// ── Stats edge cases ─────────────────────────────────────────────

	describe("getStats — edge cases", () => {
		it("stats reflect votes across multiple items", async () => {
			const cat = await controller.createCategory({
				name: "Cat",
				slug: "cat",
			});
			const item1 = await controller.createItem({
				categoryId: cat.id,
				question: "Q1?",
				answer: "A1",
				slug: "q1",
			});
			const item2 = await controller.createItem({
				categoryId: cat.id,
				question: "Q2?",
				answer: "A2",
				slug: "q2",
			});

			await controller.vote(item1.id, true);
			await controller.vote(item1.id, true);
			await controller.vote(item2.id, false);
			await controller.vote(item2.id, true);

			const stats = await controller.getStats();
			expect(stats.totalCategories).toBe(1);
			expect(stats.totalItems).toBe(2);
			expect(stats.totalHelpful).toBe(3);
			expect(stats.totalNotHelpful).toBe(1);
		});

		it("stats after deleting items", async () => {
			const cat = await controller.createCategory({
				name: "Cat",
				slug: "cat",
			});
			const item = await controller.createItem({
				categoryId: cat.id,
				question: "Q?",
				answer: "A",
				slug: "q",
			});
			await controller.vote(item.id, true);
			await controller.deleteItem(item.id);

			const stats = await controller.getStats();
			expect(stats.totalItems).toBe(0);
			expect(stats.totalHelpful).toBe(0);
		});
	});
});
