import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createSitemapController } from "../service-impl";

describe("createSitemapController", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createSitemapController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createSitemapController(mockData);
	});

	// ── getConfig ──

	describe("getConfig", () => {
		it("returns default config on first access", async () => {
			const config = await controller.getConfig();
			expect(config.id).toBe("default");
			expect(config.baseUrl).toBe("https://example.com");
			expect(config.includeProducts).toBe(true);
			expect(config.includeCollections).toBe(true);
			expect(config.includePages).toBe(true);
			expect(config.includeBlog).toBe(true);
			expect(config.includeBrands).toBe(true);
			expect(config.defaultChangeFreq).toBe("weekly");
			expect(config.defaultPriority).toBe(0.5);
			expect(config.productChangeFreq).toBe("weekly");
			expect(config.productPriority).toBe(0.8);
			expect(config.createdAt).toBeInstanceOf(Date);
		});

		it("returns same config on subsequent calls", async () => {
			const first = await controller.getConfig();
			const second = await controller.getConfig();
			expect(first.id).toBe(second.id);
		});
	});

	// ── updateConfig ──

	describe("updateConfig", () => {
		it("updates baseUrl", async () => {
			const updated = await controller.updateConfig({
				baseUrl: "https://mystore.com",
			});
			expect(updated.baseUrl).toBe("https://mystore.com");
		});

		it("preserves unchanged fields", async () => {
			await controller.updateConfig({
				baseUrl: "https://mystore.com",
			});
			const config = await controller.getConfig();
			expect(config.includeProducts).toBe(true);
			expect(config.productPriority).toBe(0.8);
		});

		it("updates toggle fields", async () => {
			const updated = await controller.updateConfig({
				includeProducts: false,
				includeBlog: false,
			});
			expect(updated.includeProducts).toBe(false);
			expect(updated.includeBlog).toBe(false);
			expect(updated.includeCollections).toBe(true);
		});

		it("updates priority and changefreq", async () => {
			const updated = await controller.updateConfig({
				productPriority: 0.9,
				productChangeFreq: "daily",
			});
			expect(updated.productPriority).toBe(0.9);
			expect(updated.productChangeFreq).toBe("daily");
		});

		it("updates excludedPaths", async () => {
			const updated = await controller.updateConfig({
				excludedPaths: ["/admin", "/private"],
			});
			expect(updated.excludedPaths).toEqual(["/admin", "/private"]);
		});

		it("updates updatedAt timestamp", async () => {
			const original = await controller.getConfig();
			const updated = await controller.updateConfig({
				baseUrl: "https://new.com",
			});
			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
				original.updatedAt.getTime(),
			);
		});
	});

	// ── addEntry ──

	describe("addEntry", () => {
		it("adds a custom entry with path", async () => {
			const entry = await controller.addEntry({ path: "/custom-page" });
			expect(entry.id).toBeDefined();
			expect(entry.loc).toBe("https://example.com/custom-page");
			expect(entry.source).toBe("custom");
			expect(entry.changefreq).toBe("weekly");
			expect(entry.priority).toBe(0.5);
		});

		it("uses custom changefreq and priority", async () => {
			const entry = await controller.addEntry({
				path: "/important",
				changefreq: "daily",
				priority: 0.9,
			});
			expect(entry.changefreq).toBe("daily");
			expect(entry.priority).toBe(0.9);
		});

		it("includes lastmod when provided", async () => {
			const date = new Date("2024-01-15");
			const entry = await controller.addEntry({
				path: "/dated",
				lastmod: date,
			});
			expect(entry.lastmod).toEqual(date);
		});

		it("uses baseUrl from config", async () => {
			await controller.updateConfig({
				baseUrl: "https://mystore.com",
			});
			const entry = await controller.addEntry({ path: "/page" });
			expect(entry.loc).toBe("https://mystore.com/page");
		});

		it("strips trailing slash from baseUrl", async () => {
			await controller.updateConfig({
				baseUrl: "https://mystore.com/",
			});
			const entry = await controller.addEntry({ path: "/page" });
			expect(entry.loc).toBe("https://mystore.com/page");
		});
	});

	// ── removeEntry ──

	describe("removeEntry", () => {
		it("removes an entry", async () => {
			const entry = await controller.addEntry({ path: "/remove-me" });
			const removed = await controller.removeEntry(entry.id);
			expect(removed).toBe(true);
			const count = await controller.countEntries();
			expect(count).toBe(0);
		});

		it("returns false for non-existent id", async () => {
			const removed = await controller.removeEntry("non-existent");
			expect(removed).toBe(false);
		});
	});

	// ── listEntries ──

	describe("listEntries", () => {
		it("lists all entries", async () => {
			await controller.addEntry({ path: "/a" });
			await controller.addEntry({ path: "/b" });
			const entries = await controller.listEntries();
			expect(entries).toHaveLength(2);
		});

		it("filters by source", async () => {
			await controller.addEntry({ path: "/custom" });
			await controller.regenerate({
				products: [{ slug: "shoe" }],
			});
			const custom = await controller.listEntries({ source: "custom" });
			expect(custom).toHaveLength(1);
			expect(custom[0].source).toBe("custom");
		});

		it("supports pagination", async () => {
			await controller.addEntry({ path: "/a" });
			await controller.addEntry({ path: "/b" });
			await controller.addEntry({ path: "/c" });
			const page = await controller.listEntries({ take: 2 });
			expect(page).toHaveLength(2);
		});
	});

	// ── countEntries ──

	describe("countEntries", () => {
		it("counts all entries", async () => {
			await controller.addEntry({ path: "/a" });
			await controller.addEntry({ path: "/b" });
			expect(await controller.countEntries()).toBe(2);
		});

		it("counts by source", async () => {
			await controller.addEntry({ path: "/custom" });
			await controller.regenerate({
				products: [{ slug: "shoe" }],
			});
			expect(await controller.countEntries("custom")).toBe(1);
			expect(await controller.countEntries("product")).toBe(1);
		});
	});

	// ── generateXml ──

	describe("generateXml", () => {
		it("generates valid XML with no entries", async () => {
			const xml = await controller.generateXml();
			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(xml).toContain("<urlset");
			expect(xml).toContain("</urlset>");
			expect(xml).not.toContain("<url>");
		});

		it("generates XML with entries", async () => {
			await controller.addEntry({ path: "/about" });
			const xml = await controller.generateXml();
			expect(xml).toContain("<url>");
			expect(xml).toContain("<loc>https://example.com/about</loc>");
			expect(xml).toContain("<changefreq>weekly</changefreq>");
			expect(xml).toContain("<priority>0.5</priority>");
		});

		it("includes lastmod when present", async () => {
			await controller.addEntry({
				path: "/dated",
				lastmod: new Date("2024-06-15"),
			});
			const xml = await controller.generateXml();
			expect(xml).toContain("<lastmod>2024-06-15</lastmod>");
		});

		it("escapes XML special characters in URLs", async () => {
			await controller.addEntry({ path: "/search?q=foo&bar=baz" });
			const xml = await controller.generateXml();
			expect(xml).toContain("&amp;");
			expect(xml).not.toContain("&bar");
		});

		it("formats priority with one decimal place", async () => {
			await controller.addEntry({ path: "/test", priority: 0.8 });
			const xml = await controller.generateXml();
			expect(xml).toContain("<priority>0.8</priority>");
		});
	});

	// ── regenerate ──

	describe("regenerate", () => {
		it("generates homepage entry", async () => {
			const count = await controller.regenerate({});
			expect(count).toBe(1);
			const entries = await controller.listEntries();
			expect(entries).toHaveLength(1);
			expect(entries[0].loc).toBe("https://example.com");
			expect(entries[0].source).toBe("static");
			expect(entries[0].priority).toBe(1.0);
		});

		it("generates product entries", async () => {
			const count = await controller.regenerate({
				products: [
					{ slug: "red-shoes", updatedAt: new Date("2024-01-01") },
					{ slug: "blue-hat" },
				],
			});
			expect(count).toBe(3); // homepage + 2 products
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products).toHaveLength(2);
			expect(products[0].loc).toContain("/products/");
		});

		it("generates collection entries", async () => {
			await controller.regenerate({
				collections: [{ slug: "summer" }, { slug: "winter" }],
			});
			const collections = await controller.listEntries({
				source: "collection",
			});
			expect(collections).toHaveLength(2);
			expect(collections[0].loc).toContain("/collections/");
		});

		it("generates page entries", async () => {
			await controller.regenerate({
				pages: [{ slug: "about" }, { slug: "contact" }],
			});
			const pages = await controller.listEntries({ source: "page" });
			expect(pages).toHaveLength(2);
		});

		it("generates blog entries", async () => {
			await controller.regenerate({
				blog: [{ slug: "hello-world" }],
			});
			const blog = await controller.listEntries({ source: "blog" });
			expect(blog).toHaveLength(1);
			expect(blog[0].loc).toContain("/blog/hello-world");
		});

		it("generates brand entries", async () => {
			await controller.regenerate({
				brands: [{ slug: "nike" }],
			});
			const brands = await controller.listEntries({ source: "brand" });
			expect(brands).toHaveLength(1);
			expect(brands[0].loc).toContain("/brands/nike");
		});

		it("respects config toggles", async () => {
			await controller.updateConfig({ includeProducts: false });
			await controller.regenerate({
				products: [{ slug: "shoe" }],
			});
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products).toHaveLength(0);
		});

		it("uses configured priorities", async () => {
			await controller.updateConfig({ productPriority: 0.9 });
			await controller.regenerate({
				products: [{ slug: "shoe" }],
			});
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products[0].priority).toBe(0.9);
		});

		it("excludes paths in excludedPaths", async () => {
			await controller.updateConfig({
				excludedPaths: ["/products/secret"],
			});
			await controller.regenerate({
				products: [{ slug: "secret" }, { slug: "public" }],
			});
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products).toHaveLength(1);
			expect(products[0].loc).toContain("/products/public");
		});

		it("preserves custom entries on regenerate", async () => {
			await controller.addEntry({ path: "/custom-page" });
			await controller.regenerate({
				products: [{ slug: "shoe" }],
			});
			const custom = await controller.listEntries({ source: "custom" });
			expect(custom).toHaveLength(1);
			expect(custom[0].loc).toContain("/custom-page");
		});

		it("clears old auto-generated entries on regenerate", async () => {
			await controller.regenerate({
				products: [{ slug: "old-shoe" }],
			});
			await controller.regenerate({
				products: [{ slug: "new-shoe" }],
			});
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products).toHaveLength(1);
			expect(products[0].loc).toContain("new-shoe");
		});

		it("includes lastmod from updatedAt", async () => {
			const date = new Date("2024-03-10");
			await controller.regenerate({
				products: [{ slug: "shoe", updatedAt: date }],
			});
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products[0].lastmod).toEqual(date);
		});

		it("uses baseUrl from config", async () => {
			await controller.updateConfig({
				baseUrl: "https://mystore.com",
			});
			await controller.regenerate({
				products: [{ slug: "shoe" }],
			});
			const products = await controller.listEntries({
				source: "product",
			});
			expect(products[0].loc.startsWith("https://mystore.com")).toBe(true);
		});
	});

	// ── getStats ──

	describe("getStats", () => {
		it("returns empty stats for no entries", async () => {
			const stats = await controller.getStats();
			expect(stats.totalEntries).toBe(0);
			expect(stats.entriesBySource).toEqual({});
		});

		it("counts entries by source", async () => {
			await controller.regenerate({
				products: [{ slug: "a" }, { slug: "b" }],
				pages: [{ slug: "about" }],
			});
			const stats = await controller.getStats();
			expect(stats.totalEntries).toBe(4); // homepage + 2 products + 1 page
			expect(stats.entriesBySource.product).toBe(2);
			expect(stats.entriesBySource.page).toBe(1);
			expect(stats.entriesBySource.static).toBe(1);
		});

		it("includes custom entries in count", async () => {
			await controller.addEntry({ path: "/custom" });
			const stats = await controller.getStats();
			expect(stats.entriesBySource.custom).toBe(1);
		});
	});
});
