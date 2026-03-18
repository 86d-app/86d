import { describe, expect, it } from "vitest";
import {
	adminEndpoints,
	createAdminEndpointsWithSettings,
} from "../admin/endpoints";
import { createGetSettingsEndpoint } from "../admin/endpoints/get-settings";
import { createStoreEndpoints, storeEndpoints } from "../store/endpoints";
import { createUberDirectWebhook } from "../store/endpoints/webhook";

describe("uber-direct endpoint security", () => {
	describe("store endpoints (no credentials)", () => {
		it("only exposes read-only delivery route without credentials", () => {
			const routes = Object.keys(storeEndpoints);
			expect(routes).toContain("/uber-direct/deliveries/:id");
			expect(routes).not.toContain("/uber-direct/quotes");
			expect(routes).not.toContain("/uber-direct/deliveries");
		});

		it("does not expose webhook without credentials", () => {
			const routes = Object.keys(storeEndpoints);
			expect(routes).not.toContain("/uber-direct/webhook");
		});

		it("store endpoints are defined as functions", () => {
			for (const endpoint of Object.values(storeEndpoints)) {
				expect(typeof endpoint).toBe("function");
			}
		});
	});

	describe("store endpoints (with credentials)", () => {
		it("includes webhook endpoint", () => {
			const webhook = createUberDirectWebhook("test-key");
			const endpoints = createStoreEndpoints(webhook);
			const routes = Object.keys(endpoints);
			expect(routes).toContain("/uber-direct/webhook");
			expect(routes).toContain("/uber-direct/quotes");
			expect(routes).toContain("/uber-direct/deliveries");
			expect(routes).toContain("/uber-direct/deliveries/:id");
		});
	});

	describe("admin endpoints (no credentials)", () => {
		it("exposes expected admin routes", () => {
			const routes = Object.keys(adminEndpoints);
			expect(routes).toContain("/admin/uber-direct/deliveries");
			expect(routes).toContain("/admin/uber-direct/deliveries/:id/status");
			expect(routes).toContain("/admin/uber-direct/quotes");
			expect(routes).toContain("/admin/uber-direct/stats");
		});

		it("does not expose settings without credentials", () => {
			const routes = Object.keys(adminEndpoints);
			expect(routes).not.toContain("/admin/uber-direct/settings");
		});

		it("admin endpoints are defined as functions", () => {
			for (const endpoint of Object.values(adminEndpoints)) {
				expect(typeof endpoint).toBe("function");
			}
		});
	});

	describe("admin endpoints (with credentials)", () => {
		it("includes settings endpoint", () => {
			const settings = createGetSettingsEndpoint({
				clientId: "test",
				clientSecret: "test",
				customerId: "test",
			});
			const endpoints = createAdminEndpointsWithSettings(settings);
			const routes = Object.keys(endpoints);
			expect(routes).toContain("/admin/uber-direct/settings");
			expect(routes).toContain("/admin/uber-direct/deliveries");
			expect(routes).toContain("/admin/uber-direct/stats");
		});
	});
});
