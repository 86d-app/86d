import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for 86d commerce platform.
 *
 * Run against locally running apps:
 *   bun run dev:store       # start the store dev server (port 3000)
 *   bun run test:e2e        # run all E2E tests
 *
 * Environment variables:
 *   E2E_STORE_URL       — store URL (default: http://localhost:3000)
 *   E2E_ADMIN_EMAIL     — admin account email for auth tests
 *   E2E_ADMIN_PASSWORD  — admin account password for auth tests
 */

const STORE_URL = process.env.E2E_STORE_URL || "http://localhost:3000";

export default defineConfig({
	testDir: "tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "html",
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	use: {
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "on-first-retry",
	},
	projects: [
		/* ── Store (storefront + store admin) ─────────────────────────── */
		{
			name: "store-chromium",
			testMatch: [
				"storefront.spec.ts",
				"admin.spec.ts",
				"checkout.spec.ts",
				"dashboard.spec.ts",
				"accessibility.spec.ts",
				"performance.spec.ts",
			],
			use: {
				...devices["Desktop Chrome"],
				baseURL: STORE_URL,
			},
		},
		{
			name: "store-mobile",
			testMatch: ["storefront.spec.ts"],
			use: {
				...devices["Pixel 5"],
				baseURL: STORE_URL,
			},
		},
		/* ── Visual regression (multiple viewports) ───────────────────── */
		{
			name: "visual-desktop",
			testMatch: ["visual.spec.ts"],
			use: {
				...devices["Desktop Chrome"],
				baseURL: STORE_URL,
				viewport: { width: 1280, height: 720 },
			},
		},
		{
			name: "visual-tablet",
			testMatch: ["visual.spec.ts"],
			use: {
				...devices["Desktop Chrome"],
				baseURL: STORE_URL,
				viewport: { width: 768, height: 1024 },
			},
		},
		{
			name: "visual-mobile",
			testMatch: ["visual.spec.ts"],
			use: {
				...devices["Pixel 5"],
				baseURL: STORE_URL,
				viewport: { width: 375, height: 667 },
			},
		},
		/* ── Visual regression — dark mode ────────────────────────────── */
		{
			name: "visual-dark-desktop",
			testMatch: ["visual.spec.ts"],
			use: {
				...devices["Desktop Chrome"],
				baseURL: STORE_URL,
				viewport: { width: 1280, height: 720 },
				colorScheme: "dark",
			},
		},
		{
			name: "visual-dark-tablet",
			testMatch: ["visual.spec.ts"],
			use: {
				...devices["Desktop Chrome"],
				baseURL: STORE_URL,
				viewport: { width: 768, height: 1024 },
				colorScheme: "dark",
			},
		},
		{
			name: "visual-dark-mobile",
			testMatch: ["visual.spec.ts"],
			use: {
				...devices["Pixel 5"],
				baseURL: STORE_URL,
				viewport: { width: 375, height: 667 },
				colorScheme: "dark",
			},
		},
	],
	/* Start dev server before tests if not already running */
	webServer: {
		command: "bun run dev:store",
		url: STORE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
