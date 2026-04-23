import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adminEndpoints } from "../admin/endpoints";

describe("bulk-pricing admin hook contract", () => {
	it("binds the landing page to a registered admin endpoint", () => {
		const source = readFileSync(
			join(process.cwd(), "src/admin/components/index.tsx"),
			"utf-8",
		);
		const hookMatch = source.match(
			/client\.module\("bulk-pricing"\)\.admin\["([^"]+)"\]/,
		);

		expect(hookMatch?.[1]).toBe("/admin/bulk-pricing/rules");
		expect(adminEndpoints["/admin/bulk-pricing/rules"]).toBeDefined();
	});
});
