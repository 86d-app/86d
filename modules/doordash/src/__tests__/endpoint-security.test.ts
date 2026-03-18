import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createAdminEndpointsWithSettings } from "../admin/endpoints";
import { createGetSettingsEndpoint } from "../admin/endpoints/get-settings";
import { createDoordashController } from "../service-impl";
import { createStoreEndpoints, storeEndpoints } from "../store/endpoints";
import { createDoordashWebhook } from "../store/endpoints/webhook";

describe("doordash endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createDoordashController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createDoordashController(mockData);
	});

	describe("delivery state machine safety", () => {
		it("cannot cancel a delivered delivery", async () => {
			const delivery = await controller.createDelivery({
				orderId: "o-1",
				pickupAddress: {},
				dropoffAddress: {},
				fee: 5.0,
			});
			await controller.updateDeliveryStatus(delivery.id, "delivered");
			const result = await controller.cancelDelivery(delivery.id);
			expect(result).toBeNull();
		});

		it("cannot update status after cancellation", async () => {
			const delivery = await controller.createDelivery({
				orderId: "o-2",
				pickupAddress: {},
				dropoffAddress: {},
				fee: 5.0,
			});
			await controller.cancelDelivery(delivery.id);
			const result = await controller.updateDeliveryStatus(
				delivery.id,
				"accepted",
			);
			expect(result).toBeNull();
		});

		it("get delivery returns null for non-existent id", async () => {
			const result = await controller.getDelivery("nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("store endpoints (no credentials)", () => {
		it("omits quote endpoints that require the DoorDash API", () => {
			const routes = Object.keys(storeEndpoints);
			expect(routes).toContain("/doordash/deliveries");
			expect(routes).toContain("/doordash/deliveries/:id");
			expect(routes).toContain("/doordash/availability");
			expect(routes).not.toContain("/doordash/quotes");
			expect(routes).not.toContain("/doordash/quotes/:id/accept");
		});

		it("does not expose webhook without credentials", () => {
			const routes = Object.keys(storeEndpoints);
			expect(routes).not.toContain("/doordash/webhook");
		});
	});

	describe("store endpoints (with credentials)", () => {
		it("includes quote endpoints and webhook", () => {
			const webhook = createDoordashWebhook();
			const endpoints = createStoreEndpoints(webhook);
			const routes = Object.keys(endpoints);
			expect(routes).toContain("/doordash/quotes");
			expect(routes).toContain("/doordash/quotes/:id/accept");
			expect(routes).toContain("/doordash/webhook");
			expect(routes).toContain("/doordash/deliveries");
		});
	});

	describe("admin endpoints (no credentials)", () => {
		it("always exposes settings so admin UI can show not-configured state", () => {
			const settings = createGetSettingsEndpoint({});
			const endpoints = createAdminEndpointsWithSettings(settings);
			const routes = Object.keys(endpoints);
			expect(routes).toContain("/admin/doordash/settings");
			expect(routes).toContain("/admin/doordash/deliveries");
			expect(routes).toContain("/admin/doordash/zones");
		});
	});

	describe("admin endpoints (with credentials)", () => {
		it("includes settings endpoint with credential info", () => {
			const settings = createGetSettingsEndpoint({
				developerId: "test",
				keyId: "test",
				signingSecret: "test",
			});
			const endpoints = createAdminEndpointsWithSettings(settings);
			const routes = Object.keys(endpoints);
			expect(routes).toContain("/admin/doordash/settings");
			expect(routes).toContain("/admin/doordash/deliveries");
		});
	});

	describe("zone safety", () => {
		it("cannot update non-existent zone", async () => {
			const result = await controller.updateZone("nonexistent", {
				name: "Test",
			});
			expect(result).toBeNull();
		});

		it("cannot delete non-existent zone", async () => {
			const result = await controller.deleteZone("nonexistent");
			expect(result).toBe(false);
		});

		it("deactivated zones are excluded from availability checks", async () => {
			const zone = await controller.createZone({
				name: "Zone",
				radius: 100,
				centerLat: 0,
				centerLng: 0,
				deliveryFee: 5,
				estimatedMinutes: 30,
			});
			await controller.updateZone(zone.id, { isActive: false });

			const result = await controller.checkDeliveryAvailability({
				lat: 0,
				lng: 0,
			});
			expect(result.available).toBe(false);
		});
	});
});
