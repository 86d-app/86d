import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createUberDirectController } from "../service-impl";

describe("uber-direct controller", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createUberDirectController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createUberDirectController(mockData);
	});

	// ── requestQuote ────────────────────────────────────────────────────

	describe("requestQuote", () => {
		it("creates a quote with active status", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "123 Main St" },
				dropoffAddress: { street: "456 Oak Ave" },
			});
			expect(quote.id).toBeTruthy();
			expect(quote.status).toBe("active");
			expect(quote.fee).toBeGreaterThan(0);
			expect(quote.estimatedMinutes).toBeGreaterThan(0);
		});

		it("sets expiresAt in the future", async () => {
			const before = Date.now();
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			expect(quote.expiresAt.getTime()).toBeGreaterThan(before);
		});

		it("persists the quote in data service", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			expect(mockData.size("quote")).toBe(1);
			const raw = await mockData.get("quote", quote.id);
			expect(raw).not.toBeNull();
		});

		it("stores pickup and dropoff addresses", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "123 Main", city: "Austin" },
				dropoffAddress: { street: "789 Elm", city: "Dallas" },
			});
			expect(quote.pickupAddress).toEqual({
				street: "123 Main",
				city: "Austin",
			});
			expect(quote.dropoffAddress).toEqual({
				street: "789 Elm",
				city: "Dallas",
			});
		});

		it("generates unique IDs for each quote", async () => {
			const q1 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const q2 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			expect(q1.id).not.toBe(q2.id);
		});
	});

	// ── createDelivery ──────────────────────────────────────────────────

	describe("createDelivery", () => {
		it("creates a delivery from a valid quote", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const delivery = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			expect(delivery).not.toBeNull();
			expect(delivery?.orderId).toBe("ord_1");
			expect(delivery?.status).toBe("pending");
			expect(delivery?.fee).toBe(quote.fee);
		});

		it("marks the quote as used", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const updatedQuote = await controller.getQuote(quote.id);
			expect(updatedQuote?.status).toBe("used");
		});

		it("returns null for non-existent quote", async () => {
			const delivery = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: "nonexistent",
			});
			expect(delivery).toBeNull();
		});

		it("returns null for already-used quote", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const second = await controller.createDelivery({
				orderId: "ord_2",
				quoteId: quote.id,
			});
			expect(second).toBeNull();
		});

		it("sets tip to 0 by default", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const delivery = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			expect(delivery?.tip).toBe(0);
		});

		it("accepts custom tip amount", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const delivery = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
				tip: 500,
			});
			expect(delivery?.tip).toBe(500);
		});

		it("stores pickup and dropoff notes", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const delivery = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
				pickupNotes: "Ring doorbell",
				dropoffNotes: "Leave at door",
			});
			expect(delivery?.pickupNotes).toBe("Ring doorbell");
			expect(delivery?.dropoffNotes).toBe("Leave at door");
		});
	});

	// ── getDelivery ─────────────────────────────────────────────────────

	describe("getDelivery", () => {
		it("returns a delivery by id", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const delivery = await controller.getDelivery(created?.id as string);
			expect(delivery).not.toBeNull();
			expect(delivery?.orderId).toBe("ord_1");
		});

		it("returns null for non-existent id", async () => {
			const delivery = await controller.getDelivery("nonexistent");
			expect(delivery).toBeNull();
		});
	});

	// ── cancelDelivery ──────────────────────────────────────────────────

	describe("cancelDelivery", () => {
		it("cancels a pending delivery", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const cancelled = await controller.cancelDelivery(created?.id as string);
			expect(cancelled?.status).toBe("cancelled");
		});

		it("returns null for non-existent delivery", async () => {
			const result = await controller.cancelDelivery("nonexistent");
			expect(result).toBeNull();
		});

		it("returns null for already-delivered delivery", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			await controller.updateDeliveryStatus(created?.id as string, "delivered");
			const result = await controller.cancelDelivery(created?.id as string);
			expect(result).toBeNull();
		});

		it("returns null for already-cancelled delivery", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			await controller.cancelDelivery(created?.id as string);
			const result = await controller.cancelDelivery(created?.id as string);
			expect(result).toBeNull();
		});
	});

	// ── updateDeliveryStatus ────────────────────────────────────────────

	describe("updateDeliveryStatus", () => {
		it("updates status to accepted", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const updated = await controller.updateDeliveryStatus(
				created?.id as string,
				"accepted",
			);
			expect(updated?.status).toBe("accepted");
		});

		it("returns null for non-existent delivery", async () => {
			const result = await controller.updateDeliveryStatus(
				"nonexistent",
				"accepted",
			);
			expect(result).toBeNull();
		});

		it("updates courier info along with status", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const updated = await controller.updateDeliveryStatus(
				created?.id as string,
				"picked-up",
				{
					courierName: "John",
					courierPhone: "555-1234",
					courierVehicle: "Sedan",
					trackingUrl: "https://track.uber.com/123",
				},
			);
			expect(updated?.courierName).toBe("John");
			expect(updated?.courierPhone).toBe("555-1234");
			expect(updated?.courierVehicle).toBe("Sedan");
			expect(updated?.trackingUrl).toBe("https://track.uber.com/123");
		});

		it("updates updatedAt timestamp", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const created = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: quote.id,
			});
			const original = created?.updatedAt.getTime() ?? 0;
			const updated = await controller.updateDeliveryStatus(
				created?.id as string,
				"accepted",
			);
			expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(original);
		});
	});

	// ── listDeliveries ──────────────────────────────────────────────────

	describe("listDeliveries", () => {
		it("returns empty array when no deliveries exist", async () => {
			const deliveries = await controller.listDeliveries();
			expect(deliveries).toHaveLength(0);
		});

		it("returns all deliveries", async () => {
			const q1 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const q2 = await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			await controller.createDelivery({
				orderId: "ord_1",
				quoteId: q1.id,
			});
			await controller.createDelivery({
				orderId: "ord_2",
				quoteId: q2.id,
			});
			const deliveries = await controller.listDeliveries();
			expect(deliveries).toHaveLength(2);
		});

		it("filters by status", async () => {
			const q1 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const q2 = await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			const d1 = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: q1.id,
			});
			await controller.createDelivery({
				orderId: "ord_2",
				quoteId: q2.id,
			});
			await controller.updateDeliveryStatus(d1?.id as string, "delivered");
			const delivered = await controller.listDeliveries({
				status: "delivered",
			});
			expect(delivered).toHaveLength(1);
			expect(delivered[0].status).toBe("delivered");
		});

		it("filters by orderId", async () => {
			const q1 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const q2 = await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			await controller.createDelivery({
				orderId: "ord_1",
				quoteId: q1.id,
			});
			await controller.createDelivery({
				orderId: "ord_2",
				quoteId: q2.id,
			});
			const results = await controller.listDeliveries({
				orderId: "ord_1",
			});
			expect(results).toHaveLength(1);
			expect(results[0].orderId).toBe("ord_1");
		});

		it("respects take and skip", async () => {
			const q1 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const q2 = await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			await controller.createDelivery({
				orderId: "ord_1",
				quoteId: q1.id,
			});
			await controller.createDelivery({
				orderId: "ord_2",
				quoteId: q2.id,
			});
			const page = await controller.listDeliveries({ take: 1 });
			expect(page).toHaveLength(1);

			const skipped = await controller.listDeliveries({ skip: 10 });
			expect(skipped).toHaveLength(0);
		});
	});

	// ── getQuote / listQuotes ───────────────────────────────────────────

	describe("getQuote", () => {
		it("returns a quote by id", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const found = await controller.getQuote(quote.id);
			expect(found).not.toBeNull();
			expect(found?.id).toBe(quote.id);
		});

		it("returns null for non-existent id", async () => {
			const found = await controller.getQuote("nonexistent");
			expect(found).toBeNull();
		});
	});

	describe("listQuotes", () => {
		it("returns all quotes", async () => {
			await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			const quotes = await controller.listQuotes();
			expect(quotes).toHaveLength(2);
		});

		it("filters by status", async () => {
			const q = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			await controller.createDelivery({
				orderId: "ord_1",
				quoteId: q.id,
			});
			const active = await controller.listQuotes({ status: "active" });
			expect(active).toHaveLength(1);
			const used = await controller.listQuotes({ status: "used" });
			expect(used).toHaveLength(1);
		});
	});

	// ── getDeliveryStats ────────────────────────────────────────────────

	describe("getDeliveryStats", () => {
		it("returns zeroes when no deliveries exist", async () => {
			const stats = await controller.getDeliveryStats();
			expect(stats.totalDeliveries).toBe(0);
			expect(stats.totalFees).toBe(0);
			expect(stats.totalTips).toBe(0);
		});

		it("aggregates delivery stats correctly", async () => {
			const q1 = await controller.requestQuote({
				pickupAddress: { street: "A" },
				dropoffAddress: { street: "B" },
			});
			const q2 = await controller.requestQuote({
				pickupAddress: { street: "C" },
				dropoffAddress: { street: "D" },
			});
			const q3 = await controller.requestQuote({
				pickupAddress: { street: "E" },
				dropoffAddress: { street: "F" },
			});
			const d1 = await controller.createDelivery({
				orderId: "ord_1",
				quoteId: q1.id,
				tip: 200,
			});
			const d2 = await controller.createDelivery({
				orderId: "ord_2",
				quoteId: q2.id,
				tip: 300,
			});
			await controller.createDelivery({
				orderId: "ord_3",
				quoteId: q3.id,
			});

			await controller.updateDeliveryStatus(d1?.id as string, "delivered");
			await controller.cancelDelivery(d2?.id as string);

			const stats = await controller.getDeliveryStats();
			expect(stats.totalDeliveries).toBe(3);
			expect(stats.totalDelivered).toBe(1);
			expect(stats.totalCancelled).toBe(1);
			expect(stats.totalPending).toBe(1);
			expect(stats.totalTips).toBe(500);
			expect(stats.totalFees).toBeGreaterThan(0);
		});
	});

	// ── full lifecycle ──────────────────────────────────────────────────

	describe("full lifecycle", () => {
		it("quote -> delivery -> picked-up -> delivered", async () => {
			const quote = await controller.requestQuote({
				pickupAddress: { street: "123 Main St" },
				dropoffAddress: { street: "456 Oak Ave" },
			});
			expect(quote.status).toBe("active");

			const delivery = await controller.createDelivery({
				orderId: "ord_lifecycle",
				quoteId: quote.id,
				tip: 400,
			});
			expect(delivery?.status).toBe("pending");

			const accepted = await controller.updateDeliveryStatus(
				delivery?.id as string,
				"accepted",
				{ externalId: "uber_ext_123" },
			);
			expect(accepted?.status).toBe("accepted");
			expect(accepted?.externalId).toBe("uber_ext_123");

			const pickedUp = await controller.updateDeliveryStatus(
				delivery?.id as string,
				"picked-up",
				{
					courierName: "Jane",
					courierPhone: "555-9876",
					actualPickupTime: new Date(),
				},
			);
			expect(pickedUp?.status).toBe("picked-up");
			expect(pickedUp?.courierName).toBe("Jane");

			const delivered = await controller.updateDeliveryStatus(
				delivery?.id as string,
				"delivered",
				{ actualDeliveryTime: new Date() },
			);
			expect(delivered?.status).toBe("delivered");
			expect(delivered?.actualDeliveryTime).toBeDefined();

			// Quote is used
			const usedQuote = await controller.getQuote(quote.id);
			expect(usedQuote?.status).toBe("used");
		});
	});
});
