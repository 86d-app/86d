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
 *
 * Dark mode runs:
 *   playwright test visual.spec.ts --project=visual-dark-desktop
 *   playwright test visual.spec.ts --project=visual-dark-tablet
 *   playwright test visual.spec.ts --project=visual-dark-mobile
 */

const SCREENSHOT_OPTS = { fullPage: true, maxDiffPixelRatio: 0.02 };

// ─── Core storefront pages ──────────────────────────────────────────────────

test.describe("Storefront — Visual", () => {
	test("homepage", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("homepage.png", SCREENSHOT_OPTS);
	});

	test("product listing", async ({ page }) => {
		await page.goto("/products");
		await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("products.png", SCREENSHOT_OPTS);
	});

	test("about page", async ({ page }) => {
		await page.goto("/about");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("about.png", SCREENSHOT_OPTS);
	});

	test("contact page", async ({ page }) => {
		await page.goto("/contact");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("contact.png", SCREENSHOT_OPTS);
	});

	test("collections page", async ({ page }) => {
		await page.goto("/collections");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("collections.png", SCREENSHOT_OPTS);
	});

	test("search page", async ({ page }) => {
		await page.goto("/search");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("search.png", SCREENSHOT_OPTS);
	});

	test("blog page", async ({ page }) => {
		await page.goto("/blog");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("blog.png", SCREENSHOT_OPTS);
	});

	test("gift cards page", async ({ page }) => {
		await page.goto("/gift-cards");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("gift-cards.png", SCREENSHOT_OPTS);
	});

	test("privacy page", async ({ page }) => {
		await page.goto("/privacy");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("privacy.png", SCREENSHOT_OPTS);
	});

	test("terms page", async ({ page }) => {
		await page.goto("/terms");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("terms.png", SCREENSHOT_OPTS);
	});

	test("order tracking page", async ({ page }) => {
		await page.goto("/track");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("track.png", SCREENSHOT_OPTS);
	});
});

// ─── Auth pages ─────────────────────────────────────────────────────────────

test.describe("Auth — Visual", () => {
	test("signin page", async ({ page }) => {
		await page.goto("/auth/signin");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("auth-signin.png", SCREENSHOT_OPTS);
	});

	test("signup page", async ({ page }) => {
		await page.goto("/auth/signup");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("auth-signup.png", SCREENSHOT_OPTS);
	});
});

// ─── Checkout ───────────────────────────────────────────────────────────────

test.describe("Checkout — Visual", () => {
	test("checkout page (empty cart)", async ({ page }) => {
		await page.goto("/checkout");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot(
			"checkout-empty.png",
			SCREENSHOT_OPTS,
		);
	});
});

// ─── Error pages ────────────────────────────────────────────────────────────

test.describe("Error — Visual", () => {
	test("404 not found", async ({ page }) => {
		await page.goto("/this-page-does-not-exist");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("not-found.png", SCREENSHOT_OPTS);
	});
});

// ─── Cart drawer ────────────────────────────────────────────────────────────

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

// ─── Admin pages ────────────────────────────────────────────────────────────

test.describe("Admin — Visual", () => {
	test("admin login page", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot("admin.png", SCREENSHOT_OPTS);
	});
});
