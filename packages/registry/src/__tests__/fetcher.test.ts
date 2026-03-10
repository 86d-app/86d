import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureCacheDir, fetchModule } from "../fetcher.js";
import type { ModuleSpecifier, RegistryManifest } from "../types.js";

const TMP_ROOT = join(import.meta.dirname, ".tmp-fetcher-test");

beforeAll(() => {
	// Create a fake project structure with a local module
	mkdirSync(join(TMP_ROOT, "modules", "products", "src"), {
		recursive: true,
	});
	writeFileSync(
		join(TMP_ROOT, "modules", "products", "package.json"),
		JSON.stringify({ name: "@86d-app/products", version: "0.0.1" }),
	);
});

afterAll(() => {
	rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("fetchModule", () => {
	it("returns local path for local source", async () => {
		const spec: ModuleSpecifier = {
			raw: "products",
			source: "local",
			name: "products",
			packageName: "@86d-app/products",
		};

		const result = await fetchModule(spec, TMP_ROOT);
		expect(result.success).toBe(true);
		expect(result.localPath).toBe(join(TMP_ROOT, "modules", "products"));
	});

	it("fails for registry source without manifest", async () => {
		const spec: ModuleSpecifier = {
			raw: "@86d-app/shipping",
			source: "registry",
			name: "shipping",
			packageName: "@86d-app/shipping",
		};

		const result = await fetchModule(spec, TMP_ROOT);
		expect(result.success).toBe(false);
		expect(result.error).toContain("No registry manifest");
	});

	it("fails for registry source with module not in manifest", async () => {
		const spec: ModuleSpecifier = {
			raw: "@86d-app/unknown",
			source: "registry",
			name: "unknown",
			packageName: "@86d-app/unknown",
		};

		const manifest: RegistryManifest = {
			version: 1,
			baseUrl: "https://github.com/86d-app/86d",
			defaultRef: "main",
			modules: {},
		};

		const result = await fetchModule(spec, TMP_ROOT, manifest);
		expect(result.success).toBe(false);
		expect(result.error).toContain("not found in registry");
	});

	it("fails for github source without repo", async () => {
		const spec: ModuleSpecifier = {
			raw: "github:",
			source: "github",
			name: "test",
			packageName: "@86d-app/test",
		};

		const result = await fetchModule(spec, TMP_ROOT);
		expect(result.success).toBe(false);
		expect(result.error).toContain("missing repo");
	});

	it("skips fetch for github source when module already exists", async () => {
		const spec: ModuleSpecifier = {
			raw: "github:86d-app/86d/modules/products",
			source: "github",
			name: "products",
			packageName: "@86d-app/products",
			repo: "86d-app/86d",
			path: "modules/products",
			ref: "main",
		};

		const result = await fetchModule(spec, TMP_ROOT);
		expect(result.success).toBe(true);
		expect(result.localPath).toBe(join(TMP_ROOT, "modules", "products"));
	});
});

describe("ensureCacheDir", () => {
	it("creates .86d directory", () => {
		const cacheDir = ensureCacheDir(TMP_ROOT);
		expect(cacheDir).toBe(join(TMP_ROOT, ".86d"));
	});
});
