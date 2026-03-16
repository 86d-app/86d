import { describe, expect, it } from "vitest";
import { adminEndpoints } from "../admin/endpoints";
import { storeEndpoints } from "../store/endpoints";

describe("uber-direct endpoint security", () => {
	describe("store endpoints", () => {
		it("exposes expected store routes", () => {
			const routes = Object.keys(storeEndpoints);
			expect(routes).toContain("/uber-direct/quotes");
			expect(routes).toContain("/uber-direct/deliveries");
			expect(routes).toContain("/uber-direct/deliveries/:id");
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
			expect(routes).toContain("/admin/uber-direct/deliveries");
			expect(routes).toContain("/admin/uber-direct/deliveries/:id/status");
			expect(routes).toContain("/admin/uber-direct/quotes");
			expect(routes).toContain("/admin/uber-direct/stats");
		});

		it("admin endpoints are defined as functions", () => {
			for (const endpoint of Object.values(adminEndpoints)) {
				expect(typeof endpoint).toBe("function");
			}
		});
	});
});
