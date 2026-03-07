import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import { createFulfillmentController } from "../service-impl";

// ---------------------------------------------------------------------------
// createFulfillment
// ---------------------------------------------------------------------------

describe("createFulfillment", () => {
	it("creates a fulfillment with items", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "order-1",
			items: [{ lineItemId: "item-1", quantity: 2 }],
		});

		expect(f.id).toBeTruthy();
		expect(f.orderId).toBe("order-1");
		expect(f.status).toBe("pending");
		expect(f.items).toEqual([{ lineItemId: "item-1", quantity: 2 }]);
		expect(f.createdAt).toBeInstanceOf(Date);
		expect(f.updatedAt).toBeInstanceOf(Date);
	});

	it("stores optional notes", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "order-1",
			items: [{ lineItemId: "item-1", quantity: 1 }],
			notes: "Handle with care",
		});
		expect(f.notes).toBe("Handle with care");
	});

	it("creates with multiple items", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "order-1",
			items: [
				{ lineItemId: "item-1", quantity: 1 },
				{ lineItemId: "item-2", quantity: 3 },
			],
		});
		expect(f.items).toHaveLength(2);
	});

	it("throws when items array is empty", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		await expect(
			ctrl.createFulfillment({ orderId: "order-1", items: [] }),
		).rejects.toThrow("at least one item");
	});
});

// ---------------------------------------------------------------------------
// getFulfillment
// ---------------------------------------------------------------------------

describe("getFulfillment", () => {
	it("returns null for missing fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		expect(await ctrl.getFulfillment("nope")).toBeNull();
	});

	it("returns the fulfillment when it exists", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "order-1",
			items: [{ lineItemId: "item-1", quantity: 1 }],
		});
		const fetched = await ctrl.getFulfillment(f.id);
		expect(fetched?.id).toBe(f.id);
		expect(fetched?.orderId).toBe("order-1");
	});
});

// ---------------------------------------------------------------------------
// listByOrder
// ---------------------------------------------------------------------------

describe("listByOrder", () => {
	it("lists fulfillments for an order", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		await ctrl.createFulfillment({
			orderId: "order-1",
			items: [{ lineItemId: "item-1", quantity: 1 }],
		});
		await ctrl.createFulfillment({
			orderId: "order-1",
			items: [{ lineItemId: "item-2", quantity: 2 }],
		});
		await ctrl.createFulfillment({
			orderId: "order-2",
			items: [{ lineItemId: "item-3", quantity: 1 }],
		});

		const results = await ctrl.listByOrder("order-1");
		expect(results).toHaveLength(2);
		expect(results.every((f) => f.orderId === "order-1")).toBe(true);
	});

	it("returns empty array for order with no fulfillments", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		expect(await ctrl.listByOrder("none")).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// listFulfillments
// ---------------------------------------------------------------------------

describe("listFulfillments", () => {
	it("lists all fulfillments", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.createFulfillment({
			orderId: "o-2",
			items: [{ lineItemId: "i-2", quantity: 1 }],
		});
		expect(await ctrl.listFulfillments()).toHaveLength(2);
	});

	it("filters by status", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f1 = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.createFulfillment({
			orderId: "o-2",
			items: [{ lineItemId: "i-2", quantity: 1 }],
		});
		await ctrl.updateStatus(f1.id, "processing");

		const processing = await ctrl.listFulfillments({
			status: "processing",
		});
		expect(processing).toHaveLength(1);
		expect(processing[0].id).toBe(f1.id);
	});

	it("respects limit and offset", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		for (let i = 0; i < 5; i++) {
			await ctrl.createFulfillment({
				orderId: `o-${i}`,
				items: [{ lineItemId: `i-${i}`, quantity: 1 }],
			});
		}

		const page = await ctrl.listFulfillments({ limit: 2, offset: 1 });
		expect(page).toHaveLength(2);
	});

	it("returns empty array when none exist", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		expect(await ctrl.listFulfillments()).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------

describe("updateStatus", () => {
	it("transitions pending → processing", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		const updated = await ctrl.updateStatus(f.id, "processing");
		expect(updated?.status).toBe("processing");
	});

	it("transitions pending → shipped and sets shippedAt", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		const updated = await ctrl.updateStatus(f.id, "shipped");
		expect(updated?.status).toBe("shipped");
		expect(updated?.shippedAt).toBeInstanceOf(Date);
	});

	it("transitions shipped → delivered and sets deliveredAt", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "shipped");
		const updated = await ctrl.updateStatus(f.id, "delivered");
		expect(updated?.status).toBe("delivered");
		expect(updated?.deliveredAt).toBeInstanceOf(Date);
	});

	it("rejects invalid transition delivered → pending", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "shipped");
		await ctrl.updateStatus(f.id, "delivered");
		await expect(ctrl.updateStatus(f.id, "pending")).rejects.toThrow(
			"Cannot transition",
		);
	});

	it("rejects transition from cancelled", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "cancelled");
		await expect(ctrl.updateStatus(f.id, "pending")).rejects.toThrow(
			"Cannot transition",
		);
	});

	it("returns null for missing fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		expect(await ctrl.updateStatus("ghost", "processing")).toBeNull();
	});

	it("advances updatedAt timestamp", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await new Promise((r) => setTimeout(r, 1));
		const updated = await ctrl.updateStatus(f.id, "processing");
		expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
			f.updatedAt.getTime(),
		);
	});
});

// ---------------------------------------------------------------------------
// addTracking
// ---------------------------------------------------------------------------

describe("addTracking", () => {
	it("adds carrier and tracking number", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		const updated = await ctrl.addTracking(f.id, {
			carrier: "UPS",
			trackingNumber: "1Z999AA10123456784",
		});
		expect(updated?.carrier).toBe("UPS");
		expect(updated?.trackingNumber).toBe("1Z999AA10123456784");
	});

	it("stores optional tracking URL", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		const updated = await ctrl.addTracking(f.id, {
			carrier: "FedEx",
			trackingNumber: "794644790138",
			trackingUrl: "https://www.fedex.com/track?id=794644790138",
		});
		expect(updated?.trackingUrl).toBe(
			"https://www.fedex.com/track?id=794644790138",
		);
	});

	it("rejects tracking on delivered fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "shipped");
		await ctrl.updateStatus(f.id, "delivered");
		await expect(
			ctrl.addTracking(f.id, {
				carrier: "UPS",
				trackingNumber: "123",
			}),
		).rejects.toThrow("Cannot add tracking to a delivered fulfillment");
	});

	it("rejects tracking on cancelled fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "cancelled");
		await expect(
			ctrl.addTracking(f.id, {
				carrier: "UPS",
				trackingNumber: "123",
			}),
		).rejects.toThrow("Cannot add tracking to a cancelled fulfillment");
	});

	it("returns null for missing fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		expect(
			await ctrl.addTracking("ghost", {
				carrier: "UPS",
				trackingNumber: "123",
			}),
		).toBeNull();
	});

	it("overwrites existing tracking info", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.addTracking(f.id, {
			carrier: "UPS",
			trackingNumber: "OLD",
		});
		const updated = await ctrl.addTracking(f.id, {
			carrier: "FedEx",
			trackingNumber: "NEW",
		});
		expect(updated?.carrier).toBe("FedEx");
		expect(updated?.trackingNumber).toBe("NEW");
	});
});

// ---------------------------------------------------------------------------
// cancelFulfillment
// ---------------------------------------------------------------------------

describe("cancelFulfillment", () => {
	it("cancels a pending fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		const cancelled = await ctrl.cancelFulfillment(f.id);
		expect(cancelled?.status).toBe("cancelled");
	});

	it("cancels a processing fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "processing");
		const cancelled = await ctrl.cancelFulfillment(f.id);
		expect(cancelled?.status).toBe("cancelled");
	});

	it("cancels a shipped fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "shipped");
		const cancelled = await ctrl.cancelFulfillment(f.id);
		expect(cancelled?.status).toBe("cancelled");
	});

	it("throws when cancelling a delivered fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.updateStatus(f.id, "shipped");
		await ctrl.updateStatus(f.id, "delivered");
		await expect(ctrl.cancelFulfillment(f.id)).rejects.toThrow(
			"Cannot cancel a delivered fulfillment",
		);
	});

	it("returns the same fulfillment if already cancelled", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		const f = await ctrl.createFulfillment({
			orderId: "o-1",
			items: [{ lineItemId: "i-1", quantity: 1 }],
		});
		await ctrl.cancelFulfillment(f.id);
		const again = await ctrl.cancelFulfillment(f.id);
		expect(again?.status).toBe("cancelled");
	});

	it("returns null for missing fulfillment", async () => {
		const ctrl = createFulfillmentController(createMockDataService());
		expect(await ctrl.cancelFulfillment("ghost")).toBeNull();
	});
});
