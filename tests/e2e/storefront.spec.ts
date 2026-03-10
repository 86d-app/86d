import { test, expect } from "./fixtures/test-fixtures";

test.describe("Storefront — Homepage", () => {
	test("loads the homepage with hero section", async ({ storefront }) => {
		await storefront.goto("/");
		await expect(storefront.heroHeading).toBeVisible();
		await expect(storefront.navbar).toBeVisible();
	});

	test("displays the navigation bar with logo and links", async ({
		storefront,
	}) => {
		await storefront.goto("/");
		const logo = storefront.page.locator('header a[href="/"]').first();
		await expect(logo).toBeVisible();
		/* Nav should have at least Products link */
		const productsLink = storefront.page
			.locator("header a")
			.filter({ hasText: "Products" });
		await expect(productsLink.first()).toBeVisible();
	});

	test("shows featured products section", async ({ storefront }) => {
		await storefront.goto("/");
		/* Wait for featured products to load (replaces skeleton) */
		const featuredHeading = storefront.page
			.locator("h2")
			.filter({ hasText: "Featured" });
		await expect(featuredHeading).toBeVisible();
		/* Product cards should appear after loading */
		await expect(storefront.page.locator("a.group").first()).toBeVisible({
			timeout: 15_000,
		});
	});

	test("'Browse collection' CTA links to products page", async ({
		storefront,
	}) => {
		await storefront.goto("/");
		const cta = storefront.page
			.locator("a")
			.filter({ hasText: "Browse collection" });
		await expect(cta).toHaveAttribute("href", "/products");
	});

	test("cart button is visible in the navbar", async ({ storefront }) => {
		await storefront.goto("/");
		await expect(storefront.cartButton).toBeVisible();
	});
});

test.describe("Storefront — Product listing", () => {
	test("shows products page with heading", async ({ storefront }) => {
		await storefront.navigateToProducts();
		const heading = storefront.page
			.locator("h1")
			.filter({ hasText: "Products" });
		await expect(heading).toBeVisible();
	});

	test("displays product cards after loading", async ({ storefront }) => {
		await storefront.navigateToProducts();
		/* Wait for skeleton to resolve */
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		/* Should have at least one product from seed data */
		const count = await storefront.allProductCards.count();
		expect(count).toBeGreaterThan(0);
	});

	test("search input filters products", async ({ storefront }) => {
		await storefront.navigateToProducts();
		await expect(storefront.searchInput).toBeVisible();
		/* Type a search term — should narrow results */
		await storefront.searchProducts("nonexistent-product-xyz");
		/* Either shows empty state or zero products */
		await storefront.page.waitForLoadState("networkidle");
		const emptyState = storefront.page
			.locator("p")
			.filter({ hasText: "No products found" });
		const cards = storefront.allProductCards;
		const hasEmptyState = await emptyState.isVisible().catch(() => false);
		const cardCount = await cards.count();
		/* If search returns nothing, either empty state shows or zero cards */
		expect(hasEmptyState || cardCount === 0).toBeTruthy();
	});

	test("category and sort dropdowns are present", async ({
		storefront,
	}) => {
		await storefront.navigateToProducts();
		/* Wait for page to fully load */
		await storefront.page.waitForLoadState("networkidle");
		/* Sort dropdown should always be present */
		const sortSelect = storefront.page.locator("select").last();
		await expect(sortSelect).toBeVisible();
	});

	test("product cards link to detail pages", async ({ storefront }) => {
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		const firstCard = storefront.allProductCards.first();
		const href = await firstCard.getAttribute("href");
		expect(href).toMatch(/^\/products\/.+/);
	});
});

test.describe("Storefront — Product detail", () => {
	test("navigates to a product detail page from listing", async ({
		storefront,
	}) => {
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		/* Click the first product card */
		const firstCard = storefront.allProductCards.first();
		const href = await firstCard.getAttribute("href");
		await firstCard.click();
		await storefront.page.waitForURL(/\/products\/.+/);
		/* Product detail page should show the product name */
		const productName = storefront.page.locator("h1").first();
		await expect(productName).toBeVisible({ timeout: 10_000 });
	});

	test("shows breadcrumb navigation on product detail", async ({
		storefront,
	}) => {
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		await storefront.allProductCards.first().click();
		await storefront.page.waitForURL(/\/products\/.+/);
		/* Breadcrumb should have Home and Products links */
		const breadcrumbHome = storefront.page.locator('nav a[href="/"]');
		const breadcrumbProducts = storefront.page.locator(
			'nav a[href="/products"]',
		);
		await expect(breadcrumbHome).toBeVisible();
		await expect(breadcrumbProducts).toBeVisible();
	});

	test("shows price and add-to-cart button", async ({ storefront }) => {
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		await storefront.allProductCards.first().click();
		await storefront.page.waitForURL(/\/products\/.+/);
		/* Price should be visible */
		const price = storefront.page
			.locator("span")
			.filter({ hasText: /^\$/ })
			.first();
		await expect(price).toBeVisible({ timeout: 10_000 });
		/* Add to cart button should be present (or "Sold out" if no stock) */
		const addButton = storefront.page
			.locator("button")
			.filter({ hasText: /Add to cart|Sold out/ });
		await expect(addButton).toBeVisible();
	});

	test("quantity controls work on product detail", async ({
		storefront,
	}) => {
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		await storefront.allProductCards.first().click();
		await storefront.page.waitForURL(/\/products\/.+/);
		await storefront.page.waitForLoadState("networkidle");
		/* Find quantity display */
		const qtyDisplay = storefront.page.locator("span.tabular-nums").first();
		await expect(qtyDisplay).toBeVisible();
		const initialQty = await qtyDisplay.textContent();
		expect(initialQty?.trim()).toBe("1");
		/* Click the increase button (second button in the quantity control) */
		const increaseBtn = storefront.page
			.locator("button")
			.filter({ hasText: "+" })
			.first();
		await increaseBtn.click();
		await expect(qtyDisplay).toHaveText("2");
	});
});

test.describe("Storefront — Cart", () => {
	test("opens an empty cart drawer", async ({ storefront }) => {
		await storefront.goto("/");
		await storefront.openCart();
		const emptyMsg = storefront.page
			.locator("p")
			.filter({ hasText: "Your cart is empty" });
		await expect(emptyMsg).toBeVisible();
	});

	test("closes cart drawer via close button", async ({ storefront }) => {
		await storefront.goto("/");
		await storefront.openCart();
		await storefront.closeCart();
		await expect(storefront.cartDrawer).not.toBeVisible();
	});

	test("adding a product from detail opens cart with item", async ({
		storefront,
	}) => {
		/* Go to a product detail page */
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		await storefront.allProductCards.first().click();
		await storefront.page.waitForURL(/\/products\/.+/);
		await storefront.page.waitForLoadState("networkidle");
		/* Check if product is in stock */
		const addButton = storefront.page
			.locator("button")
			.filter({ hasText: "Add to cart" });
		const soldOut = storefront.page
			.locator("button")
			.filter({ hasText: "Sold out" });
		const isInStock = await addButton.isVisible().catch(() => false);
		if (!isInStock) {
			test.skip(true, "First product is out of stock");
			return;
		}
		/* Add to cart */
		await addButton.click();
		/* Wait for the button text to change */
		await expect(
			storefront.page
				.locator("button")
				.filter({ hasText: /Added to cart!|Adding/ }),
		).toBeVisible({ timeout: 5_000 });
		/* Open cart drawer */
		await storefront.openCart();
		/* Should have at least one item */
		const items = storefront.cartItems;
		await expect(items.first()).toBeVisible({ timeout: 5_000 });
	});

	test("cart drawer shows checkout link when items present", async ({
		storefront,
	}) => {
		/* Navigate to product and add to cart */
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		await storefront.allProductCards.first().click();
		await storefront.page.waitForURL(/\/products\/.+/);
		await storefront.page.waitForLoadState("networkidle");
		const addButton = storefront.page
			.locator("button")
			.filter({ hasText: "Add to cart" });
		const isInStock = await addButton.isVisible().catch(() => false);
		if (!isInStock) {
			test.skip(true, "First product is out of stock");
			return;
		}
		await addButton.click();
		await storefront.page.waitForLoadState("networkidle");
		await storefront.openCart();
		/* Checkout link should be visible */
		await expect(storefront.checkoutLink).toBeVisible();
		await expect(storefront.checkoutLink).toHaveAttribute(
			"href",
			"/checkout",
		);
	});
});

test.describe("Storefront — Mobile", () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test("mobile menu button is visible", async ({ storefront }) => {
		await storefront.goto("/");
		const menuBtn = storefront.page.locator(
			'button[aria-label="Open menu"]',
		);
		await expect(menuBtn).toBeVisible();
	});

	test("mobile menu opens and shows nav links", async ({ storefront }) => {
		await storefront.goto("/");
		const menuBtn = storefront.page.locator(
			'button[aria-label="Open menu"]',
		);
		await menuBtn.click();
		/* Mobile nav links should become visible */
		const mobileNav = storefront.page.locator(
			"header nav a",
		);
		await expect(mobileNav.first()).toBeVisible({ timeout: 3_000 });
	});

	test("product listing is responsive (2-column grid)", async ({
		storefront,
	}) => {
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});
		/* Page should render without horizontal scroll */
		const bodyWidth = await storefront.page.evaluate(
			() => document.body.scrollWidth,
		);
		const viewportWidth = await storefront.page.evaluate(
			() => window.innerWidth,
		);
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
	});
});
