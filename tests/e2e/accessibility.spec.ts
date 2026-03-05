import { test, expect } from "@playwright/test";

/**
 * Accessibility tests using axe-core.
 * Install: bun add -D @axe-core/playwright
 *
 * These tests run basic accessibility checks on key pages.
 * For full axe integration, add @axe-core/playwright and use:
 *
 *   import AxeBuilder from '@axe-core/playwright';
 *   const results = await new AxeBuilder({ page }).analyze();
 *   expect(results.violations).toEqual([]);
 */

test.describe("Storefront — Accessibility", () => {
	test("homepage has main landmark", async ({ page }) => {
		await page.goto("/");
		const main = page.locator("main");
		await expect(main).toBeVisible({ timeout: 10_000 });
	});

	test("homepage has accessible header", async ({ page }) => {
		await page.goto("/");
		const header = page.locator("header").first();
		await expect(header).toBeVisible({ timeout: 10_000 });
		const nav = header.locator("nav");
		await expect(nav).toBeVisible();
	});

	test("cart button has accessible label", async ({ page }) => {
		await page.goto("/");
		const cartButton = page.locator('button[aria-label*="Cart"]');
		await expect(cartButton).toBeVisible({ timeout: 10_000 });
	});

	test("product listing has heading hierarchy", async ({ page }) => {
		await page.goto("/products");
		const h1 = page.locator("h1").first();
		await expect(h1).toBeVisible({ timeout: 15_000 });
	});

	test("product cards are keyboard focusable", async ({ page }) => {
		await page.goto("/products");
		await expect(page.locator("a.group").first()).toBeVisible({
			timeout: 15_000,
		});
		const firstCard = page.locator("a.group").first();
		await firstCard.focus();
		await expect(firstCard).toBeFocused();
	});
});

test.describe("Storefront — Forms", () => {
	test("contact form has labels", async ({ page }) => {
		await page.goto("/contact");
		const emailInput = page.locator('input[type="email"]');
		await expect(emailInput).toBeVisible({ timeout: 10_000 });
		const label = page.locator('label[for="email"], label:has-text("Email")');
		await expect(label.first()).toBeVisible();
	});
});
