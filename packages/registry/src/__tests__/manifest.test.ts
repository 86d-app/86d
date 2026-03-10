import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildManifest } from "../manifest.js";

const TMP_ROOT = join(import.meta.dirname, ".tmp-manifest-test");

beforeAll(() => {
	// Create a fake module structure
	mkdirSync(
		join(TMP_ROOT, "modules", "products", "src", "store", "components"),
		{
			recursive: true,
		},
	);
	mkdirSync(
		join(TMP_ROOT, "modules", "products", "src", "admin", "components"),
		{
			recursive: true,
		},
	);
	writeFileSync(
		join(TMP_ROOT, "modules", "products", "package.json"),
		JSON.stringify({
			name: "@86d-app/products",
			version: "0.0.4",
			description: "Product catalog management",
		}),
	);
	writeFileSync(
		join(TMP_ROOT, "modules", "products", "src", "index.ts"),
		`export default function products() {
	return {
		id: "products",
		version: "0.0.4",
		admin: {
			pages: [
				{ path: "/admin/products", component: "ProductList", group: "Catalog" },
			],
		},
		store: {
			pages: [
				{ path: "/products", component: "ProductListing" },
			],
		},
	};
}`,
	);
	writeFileSync(
		join(
			TMP_ROOT,
			"modules",
			"products",
			"src",
			"store",
			"components",
			"index.tsx",
		),
		"export default {};",
	);
	writeFileSync(
		join(
			TMP_ROOT,
			"modules",
			"products",
			"src",
			"admin",
			"components",
			"index.tsx",
		),
		"export {};",
	);

	// Another module without components
	mkdirSync(join(TMP_ROOT, "modules", "analytics", "src"), {
		recursive: true,
	});
	writeFileSync(
		join(TMP_ROOT, "modules", "analytics", "package.json"),
		JSON.stringify({
			name: "@86d-app/analytics",
			version: "0.0.1",
			description: "Analytics tracking",
		}),
	);
	writeFileSync(
		join(TMP_ROOT, "modules", "analytics", "src", "index.ts"),
		`export default function analytics() {
	return { id: "analytics", version: "0.0.1" };
}`,
	);
});

afterAll(() => {
	rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("buildManifest", () => {
	it("builds manifest from local modules", () => {
		const manifest = buildManifest(TMP_ROOT);
		expect(manifest.version).toBe(1);
		expect(manifest.baseUrl).toBe("https://github.com/86d-app/86d");
		expect(manifest.defaultRef).toBe("main");
	});

	it("includes all modules", () => {
		const manifest = buildManifest(TMP_ROOT);
		expect(Object.keys(manifest.modules).sort()).toEqual([
			"analytics",
			"products",
		]);
	});

	it("extracts module metadata", () => {
		const manifest = buildManifest(TMP_ROOT);
		const products = manifest.modules.products;

		expect(products.name).toBe("@86d-app/products");
		expect(products.version).toBe("0.0.4");
		expect(products.description).toBe("Product catalog management");
		expect(products.category).toBe("catalog");
		expect(products.path).toBe("modules/products");
	});

	it("detects store components", () => {
		const manifest = buildManifest(TMP_ROOT);
		expect(manifest.modules.products.hasStoreComponents).toBe(true);
		expect(manifest.modules.analytics.hasStoreComponents).toBe(false);
	});

	it("detects admin components", () => {
		const manifest = buildManifest(TMP_ROOT);
		expect(manifest.modules.products.hasAdminComponents).toBe(true);
		expect(manifest.modules.analytics.hasAdminComponents).toBe(false);
	});

	it("detects store pages", () => {
		const manifest = buildManifest(TMP_ROOT);
		expect(manifest.modules.products.hasStorePages).toBe(true);
		expect(manifest.modules.analytics.hasStorePages).toBe(false);
	});

	it("uses custom baseUrl and ref", () => {
		const manifest = buildManifest(TMP_ROOT, {
			baseUrl: "https://github.com/custom/repo",
			defaultRef: "develop",
		});
		expect(manifest.baseUrl).toBe("https://github.com/custom/repo");
		expect(manifest.defaultRef).toBe("develop");
	});

	it("handles non-existent modules directory", () => {
		const manifest = buildManifest("/non/existent/path");
		expect(Object.keys(manifest.modules)).toHaveLength(0);
	});
});
