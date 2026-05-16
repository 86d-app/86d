import { test, expect } from "./fixtures/test-fixtures";

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

// ─── Authenticated admin pages ───────────────────────────────────────────────

test.describe("Admin — Authenticated Visual", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.signIn();
	});

	test("admin dashboard", async ({ admin }) => {
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-dashboard.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin products page", async ({ admin }) => {
		await admin.page.goto("/admin/products");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-products.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin orders page", async ({ admin }) => {
		await admin.page.goto("/admin/orders");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-orders.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin customers page", async ({ admin }) => {
		await admin.page.goto("/admin/customers");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-customers.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin announcements list", async ({ admin }) => {
		await admin.page.goto("/admin/announcements");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-announcements-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin announcements new form", async ({ admin }) => {
		await admin.page.goto("/admin/announcements/new");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-announcements-new.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Discounts (backfill — previously uncovered) ─────────────────────────

	test("admin discounts list", async ({ admin }) => {
		await admin.page.goto("/admin/discounts");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-discounts-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin discounts analytics", async ({ admin }) => {
		await admin.page.goto("/admin/discounts/analytics");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-discounts-analytics.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin reviews list", async ({ admin }) => {
		await admin.page.goto("/admin/reviews");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-reviews-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin inventory list", async ({ admin }) => {
		await admin.page.goto("/admin/inventory");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-inventory-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Payment & fulfillment admin screens (backfill) ──────────────────────

	test("admin stripe settings", async ({ admin }) => {
		await admin.page.goto("/admin/stripe");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-stripe-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin shipping rates", async ({ admin }) => {
		await admin.page.goto("/admin/shipping");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-shipping-rates.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin tax configuration", async ({ admin }) => {
		await admin.page.goto("/admin/tax");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-tax-config.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin checkout sessions", async ({ admin }) => {
		await admin.page.goto("/admin/checkout");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-checkout-sessions.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin blog posts", async ({ admin }) => {
		await admin.page.goto("/admin/blog");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-blog-posts.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin discounts price rules", async ({ admin }) => {
		await admin.page.goto("/admin/discounts/price-rules");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-discounts-price-rules.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin loyalty program", async ({ admin }) => {
		await admin.page.goto("/admin/loyalty");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-loyalty.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin gift cards", async ({ admin }) => {
		await admin.page.goto("/admin/gift-cards");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-gift-cards.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin collections list", async ({ admin }) => {
		await admin.page.goto("/admin/collections");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-collections-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin brands list", async ({ admin }) => {
		await admin.page.goto("/admin/brands");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-brands-list.png",
			SCREENSHOT_OPTS,
		);
	});
});

// ─── Account section (authenticated shopper) ─────────────────────────────────

test.describe("Account — Visual", () => {
	test.beforeEach(async ({ admin }) => {
		// Sign in as the seeded admin user — same session works for the storefront account section
		await admin.signIn();

	test("account home page", async ({ admin }) => {
		await admin.page.goto("/account");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-home.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account orders page", async ({ admin }) => {
		await admin.page.goto("/account/orders");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-orders.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account profile page", async ({ admin }) => {
		await admin.page.goto("/account/profile");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-profile.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account addresses page", async ({ admin }) => {
		await admin.page.goto("/account/addresses");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-addresses.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account wishlist page", async ({ admin }) => {
		await admin.page.goto("/account/wishlist");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-wishlist.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account reviews page", async ({ admin }) => {
		await admin.page.goto("/account/reviews");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-reviews.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account subscriptions page", async ({ admin }) => {
		await admin.page.goto("/account/subscriptions");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-subscriptions.png",
			SCREENSHOT_OPTS,
		);
	});
});

// ─── Unauthenticated account redirect ────────────────────────────────────────

test.describe("Account — Unauthenticated", () => {
	test("account page redirects to signin", async ({ page }) => {
		await page.goto("/account");
		await page.waitForURL((url) => url.pathname.startsWith("/auth/signin"), {
			timeout: 10_000,
		});
		await page.waitForLoadState("networkidle");
		await expect(page).toHaveScreenshot(
			"account-unauthenticated-redirect.png",
			SCREENSHOT_OPTS,
		);
	});
});
