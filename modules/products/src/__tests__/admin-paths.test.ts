import { describe, expect, it } from "vitest";

describe("products — legacy admin path namespacing", () => {
	it("moves collection admin routes under /admin/products/collections", async () => {
		const { default: products } = await import("../index");
		const mod = products({});
		const pagePaths = mod.admin?.pages?.map((page) => page.path) ?? [];

		expect(pagePaths).toContain("/admin/products/collections");
		expect(pagePaths).not.toContain("/admin/collections");
		expect(mod.endpoints?.admin).toHaveProperty(
			"/admin/products/collections/list",
		);
		expect(mod.endpoints?.admin).toHaveProperty(
			"/admin/products/collections/create",
		);
		expect(mod.endpoints?.admin).not.toHaveProperty(
			"/admin/collections/create",
		);
	});
});
