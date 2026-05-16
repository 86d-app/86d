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

	// ─── Sales & Scheduling ──────────────────────────────────────────────────

	test("admin subscriptions list", async ({ admin }) => {
		await admin.page.goto("/admin/subscriptions");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-subscriptions-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin returns list", async ({ admin }) => {
		await admin.page.goto("/admin/returns");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-returns-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Customers & Programs ────────────────────────────────────────────────

	test("admin vendors list", async ({ admin }) => {
		await admin.page.goto("/admin/vendors");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-vendors-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin memberships list", async ({ admin }) => {
		await admin.page.goto("/admin/memberships");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-memberships-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin store credits list", async ({ admin }) => {
		await admin.page.goto("/admin/store-credits");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-store-credits-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin customer groups list", async ({ admin }) => {
		await admin.page.goto("/admin/customer-groups");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-customer-groups-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin referrals list", async ({ admin }) => {
		await admin.page.goto("/admin/referrals");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-referrals-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Fulfillment ─────────────────────────────────────────────────────────

	test("admin preorders list", async ({ admin }) => {
		await admin.page.goto("/admin/preorders");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-preorders-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin backorders list", async ({ admin }) => {
		await admin.page.goto("/admin/backorders");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-backorders-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Marketing & Engagement ──────────────────────────────────────────────

	test("admin newsletter list", async ({ admin }) => {
		await admin.page.goto("/admin/newsletter");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-newsletter-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin waitlist list", async ({ admin }) => {
		await admin.page.goto("/admin/waitlist");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-waitlist-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Content & Site ──────────────────────────────────────────────────────

	test("admin forms list", async ({ admin }) => {
		await admin.page.goto("/admin/forms");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-forms-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin faq list", async ({ admin }) => {
		await admin.page.goto("/admin/faq");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-faq-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin navigation list", async ({ admin }) => {
		await admin.page.goto("/admin/navigation");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-navigation-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin media library", async ({ admin }) => {
		await admin.page.goto("/admin/media");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-media-library.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin seo settings", async ({ admin }) => {
		await admin.page.goto("/admin/seo");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-seo-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Finance & System ────────────────────────────────────────────────────

	test("admin revenue overview", async ({ admin }) => {
		await admin.page.goto("/admin/revenue");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-revenue-overview.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin analytics overview", async ({ admin }) => {
		await admin.page.goto("/admin/analytics");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-analytics-overview.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin automations list", async ({ admin }) => {
		await admin.page.goto("/admin/automations");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-automations-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Support ─────────────────────────────────────────────────────────────

	test("admin tickets list", async ({ admin }) => {
		await admin.page.goto("/admin/tickets");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-tickets-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Catalog (backfill) ──────────────────────────────────────────────────

	test("admin categories list", async ({ admin }) => {
		await admin.page.goto("/admin/categories");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-categories-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin bundles list", async ({ admin }) => {
		await admin.page.goto("/admin/bundles");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-bundles-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin price lists", async ({ admin }) => {
		await admin.page.goto("/admin/price-lists");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-price-lists.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin product labels", async ({ admin }) => {
		await admin.page.goto("/admin/product-labels");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-product-labels.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin product Q&A", async ({ admin }) => {
		await admin.page.goto("/admin/product-qa");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-product-qa.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin comparisons", async ({ admin }) => {
		await admin.page.goto("/admin/comparisons");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-comparisons.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Sales (backfill) ────────────────────────────────────────────────────

	test("admin carts list", async ({ admin }) => {
		await admin.page.goto("/admin/carts");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-carts-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin abandoned carts list", async ({ admin }) => {
		await admin.page.goto("/admin/abandoned-carts");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-abandoned-carts-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin payments list", async ({ admin }) => {
		await admin.page.goto("/admin/payments");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-payments-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin invoices list", async ({ admin }) => {
		await admin.page.goto("/admin/invoices");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-invoices-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin flash sales list", async ({ admin }) => {
		await admin.page.goto("/admin/flash-sales");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-flash-sales-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin auctions list", async ({ admin }) => {
		await admin.page.goto("/admin/auctions");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-auctions-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin quotes list", async ({ admin }) => {
		await admin.page.goto("/admin/quotes");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-quotes-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Fulfillment (backfill) ──────────────────────────────────────────────

	test("admin appointments list", async ({ admin }) => {
		await admin.page.goto("/admin/appointments");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-appointments-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin gift wrapping settings", async ({ admin }) => {
		await admin.page.goto("/admin/gift-wrapping");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-gift-wrapping.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin gift registry list", async ({ admin }) => {
		await admin.page.goto("/admin/gift-registry");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-gift-registry-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin warranties list", async ({ admin }) => {
		await admin.page.goto("/admin/warranties");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-warranties-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin fulfillment overview", async ({ admin }) => {
		await admin.page.goto("/admin/fulfillment");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-fulfillment-overview.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin store pickup queue", async ({ admin }) => {
		await admin.page.goto("/admin/store-pickup");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-store-pickup.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin delivery slots list", async ({ admin }) => {
		await admin.page.goto("/admin/delivery-slots");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-delivery-slots.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Marketing (backfill) ────────────────────────────────────────────────

	test("admin social proof list", async ({ admin }) => {
		await admin.page.goto("/admin/social-proof");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-social-proof-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin recommendations settings", async ({ admin }) => {
		await admin.page.goto("/admin/recommendations");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-recommendations.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin social sharing settings", async ({ admin }) => {
		await admin.page.goto("/admin/social-sharing");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-social-sharing.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Content (backfill) ──────────────────────────────────────────────────

	test("admin cms pages list", async ({ admin }) => {
		await admin.page.goto("/admin/pages");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-pages-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin redirects list", async ({ admin }) => {
		await admin.page.goto("/admin/redirects");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-redirects-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin sitemap settings", async ({ admin }) => {
		await admin.page.goto("/admin/sitemap");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-sitemap-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin product feeds list", async ({ admin }) => {
		await admin.page.goto("/admin/product-feeds");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-product-feeds-list.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── Finance (backfill) ──────────────────────────────────────────────────

	test("admin paypal settings", async ({ admin }) => {
		await admin.page.goto("/admin/paypal");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-paypal-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin square settings", async ({ admin }) => {
		await admin.page.goto("/admin/square");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-square-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin braintree settings", async ({ admin }) => {
		await admin.page.goto("/admin/braintree");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-braintree-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin currencies list", async ({ admin }) => {
		await admin.page.goto("/admin/currencies");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-currencies-list.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin audit log", async ({ admin }) => {
		await admin.page.goto("/admin/audit-log");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-audit-log.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin search settings", async ({ admin }) => {
		await admin.page.goto("/admin/search");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-search-settings.png",
			SCREENSHOT_OPTS,
		);
	});

	// ─── System (backfill) ───────────────────────────────────────────────────

	test("admin import export", async ({ admin }) => {
		await admin.page.goto("/admin/import-export");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-import-export.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin store settings", async ({ admin }) => {
		await admin.page.goto("/admin/settings");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-settings-general.png",
			SCREENSHOT_OPTS,
		);
	});

	test("admin store-locator list", async ({ admin }) => {
		await admin.page.goto("/admin/store-locator");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"admin-store-locator-list.png",
			SCREENSHOT_OPTS,
		);
	});
});

// ─── Account section (authenticated shopper) ─────────────────────────────────

test.describe("Account — Visual", () => {
	test.beforeEach(async ({ admin }) => {
		// Sign in as the seeded admin user — same session works for the storefront account section
		await admin.signIn();
	});

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

	test("account loyalty page", async ({ admin }) => {
		await admin.page.goto("/account/loyalty");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-loyalty.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account downloads page", async ({ admin }) => {
		await admin.page.goto("/account/downloads");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-downloads.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account returns page", async ({ admin }) => {
		await admin.page.goto("/account/returns");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-returns.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account appointments page", async ({ admin }) => {
		await admin.page.goto("/account/appointments");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-appointments.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account preorders page", async ({ admin }) => {
		await admin.page.goto("/account/preorders");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-preorders.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account backorders page", async ({ admin }) => {
		await admin.page.goto("/account/backorders");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-backorders.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account store credits page", async ({ admin }) => {
		await admin.page.goto("/account/store-credits");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-store-credits.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account invoices page", async ({ admin }) => {
		await admin.page.goto("/account/invoices");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-invoices.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account warranties page", async ({ admin }) => {
		await admin.page.goto("/account/warranties");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-warranties.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account payment methods page", async ({ admin }) => {
		await admin.page.goto("/account/payment-methods");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-payment-methods.png",
			SCREENSHOT_OPTS,
		);
	});

	test("account transactions page", async ({ admin }) => {
		await admin.page.goto("/account/transactions");
		await admin.page.waitForLoadState("networkidle");
		await expect(admin.page).toHaveScreenshot(
			"account-transactions.png",
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
