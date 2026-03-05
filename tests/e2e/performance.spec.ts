import { test, expect } from "@playwright/test";

/**
 * Performance tests — Core Web Vitals and load metrics.
 * These tests assert that key pages load within acceptable time.
 */

test.describe("Storefront — Performance", () => {
	test("homepage loads within 5s", async ({ page }) => {
		const start = Date.now();
		await page.goto("/");
		await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
		const loadTime = Date.now() - start;
		expect(loadTime).toBeLessThan(5000);
	});

	test("homepage has navigation timing", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });

		const perf = await page.evaluate(() => {
			const entries = performance.getEntriesByType("navigation");
			const nav = entries[0] as PerformanceNavigationTiming | undefined;
			if (!nav) return null;
			return {
				domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
				loadComplete: nav.loadEventEnd - nav.startTime,
			};
		});

		expect(perf).not.toBeNull();
		if (perf) {
			expect(perf.domContentLoaded).toBeLessThan(3000);
		}
	});

	test("product listing loads within 8s", async ({ page }) => {
		const start = Date.now();
		await page.goto("/products");
		await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
		await expect(page.locator("a.group").first()).toBeVisible({
			timeout: 15_000,
		});
		const loadTime = Date.now() - start;
		expect(loadTime).toBeLessThan(8000);
	});
});
