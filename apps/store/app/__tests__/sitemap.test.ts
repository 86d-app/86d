import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getBaseUrl: vi.fn(() => "https://store.example.com"),
	fetchProductSlugsForSitemap: vi.fn(),
	fetchCollectionSlugsForSitemap: vi.fn(),
	fetchBlogPostSlugsForSitemap: vi.fn(),
}));

vi.mock("utils/url", () => ({
	getBaseUrl: mocks.getBaseUrl,
}));

vi.mock("../../lib/seo", () => ({
	fetchProductSlugsForSitemap: mocks.fetchProductSlugsForSitemap,
	fetchCollectionSlugsForSitemap: mocks.fetchCollectionSlugsForSitemap,
	fetchBlogPostSlugsForSitemap: mocks.fetchBlogPostSlugsForSitemap,
}));

const { default: sitemap } = await import("../sitemap");

const BASE = "https://store.example.com";

describe("sitemap()", () => {
	it("includes the homepage with highest priority", async () => {
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([]);

		const entries = await sitemap();
		const home = entries.find((e) => e.url === BASE);

		expect(home).toBeDefined();
		expect(home?.priority).toBe(1);
		expect(home?.changeFrequency).toBe("daily");
	});

	it("includes all expected static pages", async () => {
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([]);

		const entries = await sitemap();
		const urls = entries.map((e) => e.url);

		expect(urls).toContain(`${BASE}/products`);
		expect(urls).toContain(`${BASE}/collections`);
		expect(urls).toContain(`${BASE}/search`);
		expect(urls).toContain(`${BASE}/about`);
		expect(urls).toContain(`${BASE}/contact`);
		expect(urls).toContain(`${BASE}/blog`);
		expect(urls).toContain(`${BASE}/gift-cards`);
		expect(urls).toContain(`${BASE}/terms`);
		expect(urls).toContain(`${BASE}/privacy`);
	});

	it("appends product dynamic pages with correct structure", async () => {
		const updatedAt = new Date("2026-01-10");
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([
			{ slug: "blue-sneaker", updatedAt },
			{ slug: "red-hat", updatedAt },
		]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([]);

		const entries = await sitemap();

		expect(entries.some((e) => e.url === `${BASE}/products/blue-sneaker`)).toBe(
			true,
		);
		expect(entries.some((e) => e.url === `${BASE}/products/red-hat`)).toBe(
			true,
		);

		const product = entries.find(
			(e) => e.url === `${BASE}/products/blue-sneaker`,
		);
		expect(product?.changeFrequency).toBe("weekly");
		expect(product?.priority).toBe(0.8);
		expect(product?.lastModified).toBe(updatedAt);
	});

	it("appends collection dynamic pages with correct structure", async () => {
		const updatedAt = new Date("2026-02-15");
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([
			{ slug: "summer-sale", updatedAt },
		]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([]);

		const entries = await sitemap();
		const col = entries.find(
			(e) => e.url === `${BASE}/collections/summer-sale`,
		);

		expect(col).toBeDefined();
		expect(col?.priority).toBe(0.7);
	});

	it("appends blog dynamic pages with correct structure", async () => {
		const updatedAt = new Date("2026-03-01");
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([
			{ slug: "how-to-style", updatedAt },
		]);

		const entries = await sitemap();
		const post = entries.find((e) => e.url === `${BASE}/blog/how-to-style`);

		expect(post).toBeDefined();
		expect(post?.priority).toBe(0.6);
		expect(post?.changeFrequency).toBe("weekly");
	});

	it("degrades gracefully when DB fetch throws — returns only static pages", async () => {
		mocks.fetchProductSlugsForSitemap.mockRejectedValue(new Error("DB down"));
		mocks.fetchCollectionSlugsForSitemap.mockRejectedValue(
			new Error("DB down"),
		);
		mocks.fetchBlogPostSlugsForSitemap.mockRejectedValue(new Error("DB down"));

		const entries = await sitemap();

		// Static pages still present
		expect(entries.length).toBeGreaterThanOrEqual(10);
		expect(entries.find((e) => e.url === BASE)).toBeDefined();

		// No dynamic pages
		expect(entries.some((e) => e.url.includes("/products/"))).toBe(false);
		expect(entries.some((e) => e.url.includes("/collections/"))).toBe(false);
		expect(entries.some((e) => e.url.includes("/blog/"))).toBe(false);
	});

	it("combines static and all dynamic pages in the output", async () => {
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([
			{ slug: "widget", updatedAt: new Date() },
		]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([
			{ slug: "new-arrivals", updatedAt: new Date() },
		]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([
			{ slug: "news", updatedAt: new Date() },
		]);

		const entries = await sitemap();
		const urls = entries.map((e) => e.url);

		// static
		expect(urls).toContain(BASE);
		expect(urls).toContain(`${BASE}/products`);
		// dynamic
		expect(urls).toContain(`${BASE}/products/widget`);
		expect(urls).toContain(`${BASE}/collections/new-arrivals`);
		expect(urls).toContain(`${BASE}/blog/news`);
	});

	it("uses the base URL from getBaseUrl for all entries", async () => {
		mocks.getBaseUrl.mockReturnValue("https://custom-store.com");
		mocks.fetchProductSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchCollectionSlugsForSitemap.mockResolvedValue([]);
		mocks.fetchBlogPostSlugsForSitemap.mockResolvedValue([]);

		const entries = await sitemap();
		expect(
			entries.every((e) => e.url.startsWith("https://custom-store.com")),
		).toBe(true);
	});
});
