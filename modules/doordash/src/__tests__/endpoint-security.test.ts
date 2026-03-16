import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createDoordashController } from "../service-impl";

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
