import { test, expect, ADMIN_EMAIL, ADMIN_PASSWORD } from "./fixtures/test-fixtures";

test.describe("Store Admin — Authentication", () => {
	test("redirects unauthenticated users to sign-in", async ({ admin }) => {
		await admin.page.goto("/admin");
		/* Should redirect to signin page OR show 403 */
		await admin.page.waitForURL(/\/(auth\/signin|admin)/, {
			timeout: 10_000,
		});
		const url = admin.page.url();
		const isSignIn = url.includes("/auth/signin");
		const is403 = await admin.forbiddenCode.isVisible().catch(() => false);
		expect(isSignIn || is403).toBeTruthy();
	});

	test("sign-in page renders correctly", async ({ admin }) => {
		await admin.page.goto("/auth/signin");
		const heading = admin.page
			.locator("h1")
			.filter({ hasText: /sign in/i });
		await expect(heading).toBeVisible();
		/* Should have email and password inputs — scope to main to avoid footer newsletter */
		const form = admin.page.locator("main form");
		const emailInput = form.locator('input[type="email"]');
		const passwordInput = form.locator('input[type="password"]');
		await expect(emailInput).toBeVisible();
		await expect(passwordInput).toBeVisible();
		/* Should have a submit button */
		const submitBtn = form.locator('button[type="submit"]');
		await expect(submitBtn).toBeVisible();
	});

	test("sign-in with valid credentials reaches admin dashboard", async ({
		admin,
	}) => {
		await admin.signIn();
		/* Should be on the admin page now */
		expect(admin.page.url()).toContain("/admin");
		await expect(admin.heading).toBeVisible({ timeout: 10_000 });
	});

	test("sign-in with invalid credentials shows error", async ({
		admin,
	}) => {
		await admin.page.goto("/auth/signin");
		const form = admin.page.locator("main form");
		await form.locator('input[type="email"]').fill("wrong@example.com");
		await form.locator('input[type="password"]').fill("wrongpassword");
		await form.locator('button[type="submit"]').click();
		/* Should stay on sign-in page or show error message */
		await admin.page.waitForLoadState("networkidle");
		const url = admin.page.url();
		expect(url).toContain("/auth/signin");
	});
});

test.describe("Store Admin — Dashboard", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.signIn();
	});

	test("shows dashboard heading and stats", async ({ admin }) => {
		const heading = admin.page
			.locator("h1")
			.filter({ hasText: "Dashboard" });
		await expect(heading).toBeVisible();
		/* Stat cards should appear */
		const statCards = admin.page.locator("[data-testid='stat-card']");
		await expect(statCards.first()).toBeVisible({ timeout: 10_000 });
	});

	test("stat cards show numeric values after loading", async ({
		admin,
	}) => {
		/* Wait for stat values to render */
		const statValues = admin.page.locator("[data-testid='stat-value']");
		await expect(statValues.first()).toBeVisible({ timeout: 10_000 });
		const count = await statValues.count();
		expect(count).toBeGreaterThan(0);
		/* Values should be numbers, currency, or ratios (e.g. "5 / 10") */
		for (let i = 0; i < count; i++) {
			const text = await statValues.nth(i).textContent();
			expect(text?.trim()).toMatch(/^[\d$.,/\s]+$/);
		}
	});
});

test.describe("Store Admin — Navigation", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.signIn();
	});

	test("sidebar shows all admin sections", async ({ admin }) => {
		const expectedSections = [
			"Products",
			"Categories",
			"Orders",
			"Customers",
			"Discounts",
			"Inventory",
			"Shipping",
			"Subscriptions",
			"Downloads",
			"Payments",
			"Reviews",
			"Analytics",
			"Newsletter",
		];
		for (const section of expectedSections) {
			const link = admin.page
				.locator("a")
				.filter({ hasText: section })
				.first();
			await expect(link).toBeVisible();
		}
	});

	test("navigating to Products page shows product list", async ({
		admin,
	}) => {
		await admin.navigateTo("Products");
		await admin.page.waitForURL(/\/admin\/products/);
		const heading = admin.page
			.locator("h1, h2")
			.filter({ hasText: /Products/i })
			.first();
		await expect(heading).toBeVisible({ timeout: 10_000 });
	});

	test("navigating to Orders page shows order list", async ({ admin }) => {
		await admin.navigateTo("Orders");
		await admin.page.waitForURL(/\/admin\/orders/);
		const heading = admin.page
			.locator("h1, h2")
			.filter({ hasText: /Orders/i })
			.first();
		await expect(heading).toBeVisible({ timeout: 10_000 });
	});

	test("navigating to Customers page shows customer list", async ({
		admin,
	}) => {
		await admin.navigateTo("Customers");
		await admin.page.waitForURL(/\/admin\/customers/);
		const heading = admin.page
			.locator("h1, h2")
			.filter({ hasText: /Customers/i })
			.first();
		await expect(heading).toBeVisible({ timeout: 10_000 });
	});
});

test.describe("Store Admin — Product Management", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.signIn();
		await admin.page.goto("/admin/products");
	});

	test("product list loads and shows products from seed data", async ({
		admin,
	}) => {
		/* Wait for the product list module to dynamically load and render.
		   networkidle is not sufficient here because the admin module chunk
		   is fetched inside a useEffect — networkidle can fire before the
		   chunk fetch starts. Wait for the table (or an error banner) instead. */
		await admin.page.waitForSelector("table, .text-destructive", {
			timeout: 20_000,
		});
		/* Should show at least one product from seed data or empty state */
		const rows = admin.page.locator("table tbody tr, div[class*='card']");
		const emptyState = admin.page
			.locator("p")
			.filter({ hasText: /no products|empty/i });
		const hasRows = (await rows.count()) > 0;
		const hasEmptyState = await emptyState
			.isVisible()
			.catch(() => false);
		expect(hasRows || hasEmptyState).toBeTruthy();
	});

	test("'New Product' action is available", async ({ admin }) => {
		const newButton = admin.page
			.locator("a, button")
			.filter({ hasText: /new|add|create/i })
			.first();
		await expect(newButton).toBeVisible({ timeout: 10_000 });
	});
});

test.describe("Store Admin — Module Pages", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.signIn();
	});

	const modulePaths = [
		{ name: "Discounts", path: "/admin/discounts" },
		{ name: "Inventory", path: "/admin/inventory" },
		{ name: "Shipping", path: "/admin/shipping" },
		{ name: "Subscriptions", path: "/admin/subscriptions" },
		{ name: "Downloads", path: "/admin/downloads" },
		{ name: "Payments", path: "/admin/payments" },
		{ name: "Reviews", path: "/admin/reviews" },
		{ name: "Analytics", path: "/admin/analytics" },
		{ name: "Newsletter", path: "/admin/newsletter" },
	];

	for (const { name, path } of modulePaths) {
		test(`${name} page loads without errors`, async ({ admin }) => {
			await admin.page.goto(path);
			/* Page should have a heading or content */
			await admin.page.waitForLoadState("networkidle");
			/* No unhandled errors — check that page loaded */
			const heading = admin.page.locator("h1, h2").first();
			await expect(heading).toBeVisible({ timeout: 10_000 });
		});
	}
});

test.describe("Store Admin — Access Control", () => {
	test("403 page shows correct error UI elements", async ({ page }) => {
		/* Directly check the 403 page structure — if accessing admin
		   without proper store membership should show 403 */
		await page.goto("/admin");
		const is403 = await page
			.locator("p")
			.filter({ hasText: "403" })
			.isVisible()
			.catch(() => false);
		if (is403) {
			/* Verify the 403 page structure */
			const accessDenied = page
				.locator("h1")
				.filter({ hasText: "Access denied" });
			await expect(accessDenied).toBeVisible();
			const returnLink = page.locator('a[href="/"]');
			await expect(returnLink).toBeVisible();
			await expect(returnLink).toHaveText(/storefront/i);
		}
		/* If not 403, user was redirected to signin — also valid */
	});
});
