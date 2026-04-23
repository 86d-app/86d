import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adminEndpoints } from "../admin/endpoints";

describe("wish admin hook contract", () => {
	it("binds the landing page to a registered admin endpoint", () => {
		const source = readFileSync(
			join(process.cwd(), "src/admin/components/wish-admin.tsx"),
			"utf-8",
		);
		const hookMatch = source.match(
			/client\.module\("wish"\)\.admin\["([^"]+)"\]/,
		);

		expect(hookMatch?.[1]).toBe("/admin/wish/products");
		expect(adminEndpoints["/admin/wish/products"]).toBeDefined();
	});
});
