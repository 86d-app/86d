import { describe, expect, it } from "vitest";
import { adminEndpoints } from "../admin/endpoints";
import { storeEndpoints } from "../store/endpoints";

describe("tipping endpoint security", () => {
	describe("store endpoints", () => {
		it("exposes expected store routes", () => {
			const routes = Object.keys(storeEndpoints);
			expect(routes).toContain("/tipping/tips");
			expect(routes).toContain("/tipping/tips/:id");
			expect(routes).toContain("/tipping/tips/:id/delete");
			expect(routes).toContain("/tipping/tips/order/:orderId");
			expect(routes).toContain("/tipping/settings");
		});

		it("store endpoints are defined as functions", () => {
			for (const endpoint of Object.values(storeEndpoints)) {
				expect(typeof endpoint).toBe("function");
			}
		});
	});

	describe("admin endpoints", () => {
		it("exposes expected admin routes", () => {
			const routes = Object.keys(adminEndpoints);
			expect(routes).toContain("/admin/tipping/tips");
			expect(routes).toContain("/admin/tipping/tips/:id");
			expect(routes).toContain("/admin/tipping/tips/:id/split");
			expect(routes).toContain("/admin/tipping/payouts");
			expect(routes).toContain("/admin/tipping/payouts/list");
			expect(routes).toContain("/admin/tipping/stats");
			expect(routes).toContain("/admin/tipping/settings");
			expect(routes).toContain("/admin/tipping/settings/update");
		});

		it("admin endpoints are defined as functions", () => {
			for (const endpoint of Object.values(adminEndpoints)) {
				expect(typeof endpoint).toBe("function");
			}
		});
	});
});
