import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	getLocalModuleNames,
	readLocalManifest,
	resolveModules,
} from "../resolver.js";
import type { RegistryManifest, StoreConfig } from "../types.js";

const TMP_ROOT = join(import.meta.dirname, ".tmp-resolver-test");

beforeAll(() => {
	// Create a fake project structure
	mkdirSync(join(TMP_ROOT, "modules", "products", "src"), {
		recursive: true,
	});
	writeFileSync(
		join(TMP_ROOT, "modules", "products", "package.json"),
		JSON.stringify({ name: "@86d-app/products", version: "0.0.1" }),
	);

	mkdirSync(join(TMP_ROOT, "modules", "cart", "src"), { recursive: true });
	writeFileSync(
		join(TMP_ROOT, "modules", "cart", "package.json"),
		JSON.stringify({ name: "@86d-app/cart", version: "0.0.1" }),
	);

	mkdirSync(join(TMP_ROOT, "modules", "blog", "src"), { recursive: true });
	writeFileSync(
		join(TMP_ROOT, "modules", "blog", "package.json"),
		JSON.stringify({ name: "@86d-app/blog", version: "0.0.1" }),
	);
});

afterAll(() => {
	rmSync(TMP_ROOT, { recursive: true, force: true });
});

const testManifest: RegistryManifest = {
	version: 1,
	baseUrl: "https://github.com/86d-app/86d",
	defaultRef: "main",
	templates: {},
	modules: {
		products: {
			name: "@86d-app/products",
			description: "Product catalog",
			version: "0.0.1",
			category: "catalog",
			path: "modules/products",
			requires: [],
			hasStoreComponents: true,
			hasAdminComponents: true,
			hasStorePages: true,
		},
		cart: {
			name: "@86d-app/cart",
			description: "Shopping cart",
			version: "0.0.1",
			category: "sales",
			path: "modules/cart",
			requires: [],
			hasStoreComponents: true,
			hasAdminComponents: true,
			hasStorePages: false,
		},
		shipping: {
			name: "@86d-app/shipping",
			description: "Shipping rates",
			version: "0.0.1",
			category: "fulfillment",
			path: "modules/shipping",
			requires: [],
			hasStoreComponents: false,
			hasAdminComponents: true,
			hasStorePages: false,
		},
	},
};

describe("resolveModules", () => {
	it("resolves '*' to all local modules", async () => {
		const config: StoreConfig = { modules: "*" };
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		// Should find 3 local + 1 registry-only (shipping)
		expect(results.length).toBe(4);

		const local = results.filter((r) => r.status === "found");
		expect(local.length).toBe(3);
		expect(local.map((r) => r.specifier.name).sort()).toEqual([
			"blog",
			"cart",
			"products",
		]);

		const missing = results.filter((r) => r.status === "missing");
		expect(missing.length).toBe(1);
		expect(missing[0].specifier.name).toBe("shipping");
	});

	it("resolves explicit module list", async () => {
		const config: StoreConfig = {
			modules: ["@86d-app/products", "@86d-app/cart"],
		};
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		expect(results.length).toBe(2);
		expect(results[0].status).toBe("found");
		expect(results[0].specifier.name).toBe("products");
		expect(results[1].status).toBe("found");
		expect(results[1].specifier.name).toBe("cart");
	});

	it("marks unknown modules as missing", async () => {
		const config: StoreConfig = {
			modules: ["@86d-app/unknown-module"],
		};
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		expect(results.length).toBe(1);
		expect(results[0].status).toBe("missing");
		expect(results[0].error).toContain("not found");
	});

	it("resolves bare names", async () => {
		const config: StoreConfig = { modules: ["products"] };
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		expect(results.length).toBe(1);
		expect(results[0].status).toBe("found");
		expect(results[0].specifier.source).toBe("local");
	});

	it("handles undefined modules as '*'", async () => {
		const config: StoreConfig = {};
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		expect(results.length).toBe(4);
	});

	it("parses GitHub specifiers", async () => {
		const config: StoreConfig = {
			modules: ["github:owner/repo/modules/custom"],
		};
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		expect(results.length).toBe(1);
		expect(results[0].specifier.source).toBe("github");
		expect(results[0].specifier.repo).toBe("owner/repo");
		expect(results[0].status).toBe("missing");
	});

	it("parses npm specifiers", async () => {
		const config: StoreConfig = {
			modules: ["npm:@acme/commerce-module"],
		};
		const results = await resolveModules(config, {
			root: TMP_ROOT,
			manifest: testManifest,
		});

		expect(results.length).toBe(1);
		expect(results[0].specifier.source).toBe("npm");
		expect(results[0].status).toBe("missing");
	});
});

describe("getLocalModuleNames", () => {
	it("returns sorted local module names", () => {
		const names = getLocalModuleNames(TMP_ROOT);
		expect(names).toEqual(["blog", "cart", "products"]);
	});

	it("returns empty array for non-existent root", () => {
		const names = getLocalModuleNames("/non/existent/path");
		expect(names).toEqual([]);
	});
});

describe("readLocalManifest", () => {
	it("reads a valid registry.json", () => {
		const manifestPath = join(TMP_ROOT, "registry.json");
		writeFileSync(
			manifestPath,
			JSON.stringify({
				version: 1,
				baseUrl: "https://github.com/86d-app/86d",
				defaultRef: "main",
				modules: {},
				templates: {},
			}),
		);
		const result = readLocalManifest(manifestPath);
		expect(result).toBeDefined();
		expect(result?.version).toBe(1);
	});

	it("returns undefined for non-existent file", () => {
		const result = readLocalManifest("/non/existent/registry.json");
		expect(result).toBeUndefined();
	});

	it("returns undefined for invalid JSON", () => {
		const badPath = join(TMP_ROOT, "bad-registry.json");
		writeFileSync(badPath, "not json{{{");
		const result = readLocalManifest(badPath);
		expect(result).toBeUndefined();
	});

	it("returns undefined for valid JSON that fails schema validation", () => {
		const invalidPath = join(TMP_ROOT, "invalid-registry.json");
		writeFileSync(invalidPath, JSON.stringify({ version: 999, modules: {} }));
		const result = readLocalManifest(invalidPath);
		expect(result).toBeUndefined();
	});
});
