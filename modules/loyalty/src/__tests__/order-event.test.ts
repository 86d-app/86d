import { createEventBus, createScopedEmitter } from "@86d-app/core";
import {
	createMockDataService,
	createMockModuleContext,
} from "@86d-app/core/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import loyalty from "../index";

async function initModule(
	mod: ReturnType<typeof loyalty>,
	data: ReturnType<typeof createMockDataService>,
	events?: ReturnType<typeof createScopedEmitter>,
) {
	const init = mod.init;
	expect(init).toBeDefined();
	if (init) {
		const ctx = createMockModuleContext({ data });
		await init({ ...ctx, events });
	}
}

const orderPayload = {
	orderId: "order-001",
	customerId: "cust-001",
	total: 5000,
	currency: "usd",
};

describe("order.placed event listener — loyalty points", () => {
	let mockData: ReturnType<typeof createMockDataService>;

	beforeEach(() => {
		mockData = createMockDataService();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("registers an order.placed listener on init", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");

		await initModule(loyalty(), mockData, emitter);

		expect(bus.listenerCount("order.placed")).toBe(1);
	});

	it("awards points to the customer when a per_dollar rule exists", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		// 1 point per dollar; 5000 cents = $50 → 5000 points
		await mockData.upsert("loyaltyRule", "rule-1", {
			id: "rule-1",
			name: "Base Earn",
			type: "per_dollar",
			points: 1,
			active: true,
		});

		await orderEmitter.emit("order.placed", orderPayload);
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		const account = mockData
			.all("loyaltyAccount")
			.find((a) => (a as { customerId: string }).customerId === "cust-001");
		expect(account).toBeDefined();
		expect(account?.balance).toBe(5000);
	});

	it("does not award points when no loyalty rules are configured", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		// No rules seeded
		await orderEmitter.emit("order.placed", orderPayload);
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		expect(mockData.all("loyaltyAccount")).toHaveLength(0);
		expect(mockData.all("loyaltyTransaction")).toHaveLength(0);
	});

	it("does not award points when order total is zero", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		await mockData.upsert("loyaltyRule", "rule-1", {
			id: "rule-1",
			name: "Base Earn",
			type: "per_dollar",
			points: 1,
			active: true,
		});

		await orderEmitter.emit("order.placed", { ...orderPayload, total: 0 });
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		expect(mockData.all("loyaltyTransaction")).toHaveLength(0);
	});

	it("does not award points when order has no customerId", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		await mockData.upsert("loyaltyRule", "rule-1", {
			id: "rule-1",
			name: "Base Earn",
			type: "per_dollar",
			points: 1,
			active: true,
		});

		await orderEmitter.emit("order.placed", {
			...orderPayload,
			customerId: undefined,
		});
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		expect(mockData.all("loyaltyTransaction")).toHaveLength(0);
	});

	it("skips inactive rules", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		await mockData.upsert("loyaltyRule", "rule-1", {
			id: "rule-1",
			name: "Inactive Rule",
			type: "per_dollar",
			points: 5,
			active: false,
		});

		await orderEmitter.emit("order.placed", orderPayload);
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		expect(mockData.all("loyaltyTransaction")).toHaveLength(0);
	});

	it("applies minOrderAmount threshold — no points when order is below threshold", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		await mockData.upsert("loyaltyRule", "rule-1", {
			name: "Big Order Bonus",
			type: "per_dollar",
			points: 2,
			minOrderAmount: 10000,
			active: true,
		});

		// Order total 5000 < minOrderAmount 10000
		await orderEmitter.emit("order.placed", orderPayload);
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		expect(mockData.all("loyaltyTransaction")).toHaveLength(0);
	});

	it("emits loyalty.pointsEarned after awarding points", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		const emittedEvents: unknown[] = [];
		bus.on("loyalty.pointsEarned", (e) => {
			emittedEvents.push(e);
		});

		await initModule(loyalty(), mockData, emitter);

		await mockData.upsert("loyaltyRule", "rule-1", {
			id: "rule-1",
			name: "Base Earn",
			type: "per_dollar",
			points: 1,
			active: true,
		});

		await orderEmitter.emit("order.placed", orderPayload);
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		expect(emittedEvents).toHaveLength(1);
		const payload = (
			emittedEvents[0] as {
				payload: { customerId: string; points: number; orderId: string };
			}
		).payload;
		expect(payload.customerId).toBe("cust-001");
		expect(payload.points).toBeGreaterThan(0);
		expect(payload.orderId).toBe("order-001");
	});

	it("accumulates points across multiple orders for the same customer", async () => {
		const bus = createEventBus();
		const emitter = createScopedEmitter(bus, "loyalty");
		const orderEmitter = createScopedEmitter(bus, "orders");

		await initModule(loyalty(), mockData, emitter);

		await mockData.upsert("loyaltyRule", "rule-1", {
			id: "rule-1",
			name: "Base Earn",
			type: "per_dollar",
			points: 1,
			active: true,
		});

		await orderEmitter.emit("order.placed", {
			...orderPayload,
			orderId: "order-001",
			total: 2000,
		});
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		await orderEmitter.emit("order.placed", {
			...orderPayload,
			orderId: "order-002",
			total: 3000,
		});
		await new Promise<void>((r) => {
			setTimeout(r, 50);
		});

		const account = mockData
			.all("loyaltyAccount")
			.find((a) => (a as { customerId: string }).customerId === "cust-001");
		expect(account).toBeDefined();
		expect(account?.balance).toBe(5000);
	});

	it("is resilient when no events bus is provided (no init crash)", async () => {
		const mod = loyalty();
		const data = createMockDataService();
		const init = mod.init;
		if (init) {
			const ctx = createMockModuleContext({ data });
			await expect(init({ ...ctx, events: undefined })).resolves.not.toThrow();
		}
	});
});
