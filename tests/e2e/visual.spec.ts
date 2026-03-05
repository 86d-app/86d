import { test, expect } from "@playwright/test";

/**
 * Visual regression tests — screenshot comparison across viewports.
 * Run with `bun test:e2e` (uses store-chromium by default).
 * To regenerate snapshots: `bun test:e2e --update-snapshots`
 *
 * Viewport-specific runs:
 *   playwright test visual.spec.ts --project=visual-desktop
 *   playwright test visual.spec.ts --project=visual-tablet
 *   playwright test visual.spec.ts --project=visual-mobile
 */

test.describe("Storefront — Visual", () => {
	test("homepage", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("homepage.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.02,
		});
	});

	test("product listing", async ({ page }) => {
		await page.goto("/products");
		await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("products.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.02,
		});
	});

	test("about page", async ({ page }) => {
		await page.goto("/about");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("about.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.02,
		});
	});

	test("contact page", async ({ page }) => {
		await page.goto("/contact");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("contact.png", {
			fullPage: true,
			maxDiffPixelRatio: 0.02,
		});
	});
});

test.describe("Storefront — Cart drawer", () => {
	test("cart drawer open", async ({ page }) => {
		await page.goto("/");
		const cartButton = page.locator('button[aria-label*="Cart"]');
		await cartButton.click();
		await expect(
			page.locator('[role="dialog"][aria-label="Shopping cart"]'),
		).toBeVisible({ timeout: 5_000 });
		await expect(page).toHaveScreenshot("cart-drawer.png", {
			maxDiffPixelRatio: 0.02,
		});
	});
});
