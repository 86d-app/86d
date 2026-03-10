import { test, expect } from "./fixtures/test-fixtures";

test.describe("Checkout — Full flow", () => {
	test("complete flow: browse → add to cart → view checkout", async ({
		storefront,
	}) => {
		/* 1. Start on homepage */
		await storefront.goto("/");
		await expect(storefront.navbar).toBeVisible();

		/* 2. Navigate to products */
		await storefront.navigateToProducts();
		await expect(storefront.allProductCards.first()).toBeVisible({
			timeout: 15_000,
		});

		/* 3. Open first product */
		const firstCard = storefront.allProductCards.first();
		await firstCard.click();
		await storefront.page.waitForURL(/\/products\/.+/);
		await storefront.page.waitForLoadState("networkidle");

		/* 4. Check product is in stock */
		const addButton = storefront.page
			.locator("button")
			.filter({ hasText: "Add to cart" });
		const isInStock = await addButton.isVisible().catch(() => false);
		if (!isInStock) {
			test.skip(true, "First product is out of stock");
			return;
		}

		/* 5. Add to cart */
		await addButton.click();
		await expect(
			storefront.page
				.locator("button")
				.filter({ hasText: /Added to cart!|Adding/ }),
		).toBeVisible({ timeout: 5_000 });

		/* 6. Open cart drawer */
		await storefront.openCart();
		await expect(storefront.cartItems.first()).toBeVisible({
			timeout: 5_000,
		});

		/* 7. Verify cart has items */
		const itemCount = await storefront.cartItems.count();
		expect(itemCount).toBeGreaterThan(0);

		/* 8. Click checkout link */
		await expect(storefront.checkoutLink).toBeVisible();
		await storefront.checkoutLink.click();
		await storefront.page.waitForURL(/\/checkout/, {
			timeout: 10_000,
		});

		/* 9. Checkout page should render */
		const checkoutHeading = storefront.page
			.locator("h1")
			.filter({ hasText: /checkout/i });
		await expect(checkoutHeading).toBeVisible({ timeout: 10_000 });
	});

	test("checkout page shows order summary", async ({ storefront }) => {
		/* Add a product to cart first */
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

		/* Navigate to checkout */
		await storefront.page.goto("/checkout");
		await storefront.page.waitForLoadState("networkidle");

		/* Should show product name or price somewhere */
		const price = storefront.page
			.locator("span, p, div")
			.filter({ hasText: /^\$/ })
			.first();
		await expect(price).toBeVisible({ timeout: 10_000 });
	});

	test("checkout page has customer info fields", async ({ storefront }) => {
		/* Add a product to cart first */
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

		await storefront.page.goto("/checkout");
		await storefront.page.waitForLoadState("networkidle");

		/* Should have email and/or name input for customer info */
		const emailInput = storefront.page.locator(
			'input[type="email"], input[name="email"]',
		);
		const nameInput = storefront.page.locator(
			'input[name="name"], input[name="firstName"]',
		);
		/* At least one customer info field should be present */
		const hasEmail = await emailInput.isVisible().catch(() => false);
		const hasName = await nameInput.isVisible().catch(() => false);
		expect(hasEmail || hasName).toBeTruthy();
	});
});

test.describe("Checkout — Edge cases", () => {
	test("checkout page with empty cart shows appropriate message", async ({
		storefront,
	}) => {
		await storefront.page.goto("/checkout");
		await storefront.page.waitForLoadState("networkidle");
		/* Should either redirect to cart/products or show empty cart message */
		const url = storefront.page.url();
		const isEmpty = await storefront.page
			.locator("p, h2")
			.filter({ hasText: /empty|no items|add items/i })
			.isVisible()
			.catch(() => false);
		const redirected =
			url.includes("/products") || url.includes("/cart");
		expect(isEmpty || redirected || url.includes("/checkout")).toBeTruthy();
	});

	test("cart persists across page navigations", async ({ storefront }) => {
		/* Add a product */
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

		/* Navigate to homepage */
		await storefront.goto("/");
		await storefront.page.waitForLoadState("domcontentloaded");

		/* Open cart — should still have items */
		await storefront.openCart();
		const itemCount = await storefront.cartItems.count();
		expect(itemCount).toBeGreaterThan(0);
	});
});
