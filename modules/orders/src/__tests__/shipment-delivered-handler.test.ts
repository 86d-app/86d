import { createEventBus, createScopedEmitter } from "@86d-app/core";
import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createOrderController } from "../service-impl";

/**
 * Tests for the shipment.delivered → order auto-fulfillment cross-module handler.
 *
 * The orders module subscribes to "shipment.delivered" events and automatically
 * marks the corresponding order as "completed", then emits "order.fulfilled".
 *
 * These tests simulate the handler logic directly via the event bus.
 */

describe("shipment.delivered → order auto-fulfillment", () => {
	let data: ReturnType<typeof createMockDataService>;
	let bus: ReturnType<typeof createEventBus>;

	beforeEach(() => {
		data = createMockDataService();
		bus = createEventBus();
	});

	async function setupHandler() {
		const controller = createOrderController(data);
		const scopedEmitter = createScopedEmitter(bus, "orders");

		const emittedFulfillments: Array<{ orderId: string }> = [];
		bus.on("order.fulfilled", (ev) => {
			const payload = ev.payload as { orderId: string };
			emittedFulfillments.push(payload);
		});

		scopedEmitter.on<{
			orderId?: string;
			shipmentId?: string;
			trackingNumber?: string;
		}>("shipment.delivered", async (event) => {
			const payload = event.payload as {
				orderId?: string;
				shipmentId?: string;
				trackingNumber?: string;
			};
			const orderId = payload.orderId;
			if (!orderId) return;
			let order: Awaited<ReturnType<typeof controller.getById>> = null;
			try {
				order = await controller.getById(orderId);
			} catch {
				return;
			}
			if (
				!order ||
				order.status === "completed" ||
				order.status === "cancelled"
			)
				return;
			try {
				await controller.updateStatus(orderId, "completed");
			} catch {
				return;
			}
			await scopedEmitter
				.emit("order.fulfilled", {
					orderId,
					shipmentId: payload.shipmentId,
					trackingNumber: payload.trackingNumber,
				})
				.catch(() => undefined);
		});

		return { controller, emittedFulfillments };
	}

	async function createTestOrder(
		controller: ReturnType<typeof createOrderController>,
	) {
		return controller.create({
			customerId: "cust_001",
			items: [
				{
					productId: "prod_001",
					name: "Test Product",
					quantity: 1,
					price: 1000,
				},
			],
			shippingAddress: {
				firstName: "Jane",
				lastName: "Smith",
				line1: "123 Main St",
				city: "Springfield",
				state: "IL",
				postalCode: "62701",
				country: "US",
			},
			subtotal: 1000,
			total: 1000,
		});
	}

	it("marks order as completed when shipment.delivered fires for that order", async () => {
		const { controller, emittedFulfillments } = await setupHandler();
		const order = await createTestOrder(controller);

		await bus.emit("shipment.delivered", "shipping", {
			orderId: order.id,
			shipmentId: "shp_001",
			trackingNumber: "9400111899223450385668",
			status: "delivered",
		});

		const updated = await controller.getById(order.id);
		expect(updated?.status).toBe("completed");
		expect(emittedFulfillments).toHaveLength(1);
		expect(emittedFulfillments[0]?.orderId).toBe(order.id);
	});

	it("skips update when order is already completed", async () => {
		const { controller, emittedFulfillments } = await setupHandler();
		const order = await createTestOrder(controller);
		await controller.updateStatus(order.id, "completed");

		await bus.emit("shipment.delivered", "shipping", {
			orderId: order.id,
			shipmentId: "shp_002",
		});

		expect(emittedFulfillments).toHaveLength(0);
	});

	it("skips update when order is cancelled", async () => {
		const { controller, emittedFulfillments } = await setupHandler();
		const order = await createTestOrder(controller);
		await controller.cancel(order.id);

		await bus.emit("shipment.delivered", "shipping", {
			orderId: order.id,
			shipmentId: "shp_003",
		});

		expect(emittedFulfillments).toHaveLength(0);
	});

	it("skips gracefully when orderId is missing from payload", async () => {
		const { emittedFulfillments } = await setupHandler();

		await bus.emit("shipment.delivered", "shipping", {
			shipmentId: "shp_004",
		});

		expect(emittedFulfillments).toHaveLength(0);
	});

	it("skips gracefully when orderId does not match any order", async () => {
		const { emittedFulfillments } = await setupHandler();

		await bus.emit("shipment.delivered", "shipping", {
			orderId: "order_nonexistent",
			shipmentId: "shp_005",
		});

		expect(emittedFulfillments).toHaveLength(0);
	});
});
