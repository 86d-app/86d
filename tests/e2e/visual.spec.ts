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

/** Hide the Next.js dev overlay in screenshots. */
const DEV_OVERLAY_CSS =
	"nextjs-portal { display: none !important; } " +
	"body > [style*='fixed'] > button[aria-label] { display: none !important; }";

const SCREENSHOT_OPTS = {
	fullPage: true,
	maxDiffPixelRatio: 0.02,
	style: DEV_OVERLAY_CSS,
};

/** Navigate to a page and wait for it to fully settle. */
async function stableGoto(
	page: import("@playwright/test").Page,
	path: string,
) {
	await page.goto(path);
	await page.waitForLoadState("networkidle");
}

// ─── Core storefront pages ──────────────────────────────────────────────────

test.describe("Storefront — Visual", () => {
	test("homepage", async ({ page }) => {
		await stableGoto(page, "/");
		await expect(page.locator("header")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("homepage.png", SCREENSHOT_OPTS);
	});

	test("product listing", async ({ page }) => {
		await stableGoto(page, "/products");
		await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
		await expect(page).toHaveScreenshot("products.png", SCREENSHOT_OPTS);
	});

	test("about page", async ({ page }) => {
		await stableGoto(page, "/about");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("about.png", SCREENSHOT_OPTS);
	});

	test("contact page", async ({ page }) => {
		await stableGoto(page, "/contact");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("contact.png", SCREENSHOT_OPTS);
	});

	test("collections page", async ({ page }) => {
		await stableGoto(page, "/collections");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("collections.png", SCREENSHOT_OPTS);
	});

	test("search page", async ({ page }) => {
		await stableGoto(page, "/search");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("search.png", SCREENSHOT_OPTS);
	});

	test("blog page", async ({ page }) => {
		await stableGoto(page, "/blog");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("blog.png", SCREENSHOT_OPTS);
	});

	test("blog post detail", async ({ page }) => {
		await stableGoto(page, "/blog/inside-the-atelier");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("blog-post.png", SCREENSHOT_OPTS);
	});

	test("product detail", async ({ page }) => {
		await stableGoto(page, "/products/regent-penny-loafer");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("product-detail.png", SCREENSHOT_OPTS);
	});

	test("gift cards page", async ({ page }) => {
		await stableGoto(page, "/gift-cards");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("gift-cards.png", SCREENSHOT_OPTS);
	});

	test("privacy page", async ({ page }) => {
		await stableGoto(page, "/privacy");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("privacy.png", SCREENSHOT_OPTS);
	});

	test("terms page", async ({ page }) => {
		await stableGoto(page, "/terms");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("terms.png", SCREENSHOT_OPTS);
	});

	test("order tracking page", async ({ page }) => {
		await stableGoto(page, "/track");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("track.png", SCREENSHOT_OPTS);
	});
});

// ─── Auth pages ─────────────────────────────────────────────────────────────

test.describe("Auth — Visual", () => {
	test("signin page", async ({ page }) => {
		await stableGoto(page, "/auth/signin");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("auth-signin.png", SCREENSHOT_OPTS);
	});

	test("signup page", async ({ page }) => {
		await stableGoto(page, "/auth/signup");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("auth-signup.png", SCREENSHOT_OPTS);
	});
});

// ─── Cart page ──────────────────────────────────────────────────────────────

test.describe("Cart — Visual", () => {
	test("cart page (empty)", async ({ page }) => {
		await stableGoto(page, "/cart");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot("cart-empty.png", SCREENSHOT_OPTS);
	});
});

// ─── Checkout ───────────────────────────────────────────────────────────────

test.describe("Checkout — Visual", () => {
	test("checkout page (empty cart)", async ({ page }) => {
		await stableGoto(page, "/checkout");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot(
			"checkout-empty.png",
			SCREENSHOT_OPTS,
		);
	});

	test("order confirmation page", async ({ page }) => {
		await stableGoto(page, "/checkout/confirmation");
		await expect(page.locator("main")).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveScreenshot(
			"checkout-confirmation.png",
			SCREENSHOT_OPTS,
		);
	});
});

// ─── Error pages ────────────────────────────────────────────────────────────

test.describe("Error — Visual", () => {
	test("404 not found", async ({ page }) => {
		await stableGoto(page, "/this-page-does-not-exist");
		await expect(page).toHaveScreenshot("not-found.png", SCREENSHOT_OPTS);
	});
});

// ─── Cart drawer ────────────────────────────────────────────────────────────

test.describe("Storefront — Cart drawer", () => {
	test("cart drawer open", async ({ page }) => {
		await stableGoto(page, "/");
		const cartButton = page.locator('button[aria-label*="Cart"]');
		await cartButton.click();
		await expect(
			page.locator('[role="dialog"][aria-label="Shopping cart"]'),
		).toBeVisible({ timeout: 5_000 });
		await expect(page).toHaveScreenshot("cart-drawer.png", {
			maxDiffPixelRatio: 0.02,
			style: DEV_OVERLAY_CSS,
		});
	});
});

// ─── Admin pages ────────────────────────────────────────────────────────────

test.describe("Admin — Visual", () => {
	test("admin login page", async ({ page }) => {
		await stableGoto(page, "/admin");
		await expect(page).toHaveScreenshot("admin.png", SCREENSHOT_OPTS);
	});
});
