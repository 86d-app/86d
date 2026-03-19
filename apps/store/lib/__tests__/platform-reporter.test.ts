import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPlatformReporter } from "../platform-reporter";

// ── Mock logger ──────────────────────────────────────────────────────
vi.mock("utils/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

// ── Helpers ──────────────────────────────────────────────────────────

function createMockBus() {
	const handlers = new Map<string, Array<(event: unknown) => Promise<void>>>();
	return {
		on: vi.fn((type: string, handler: (event: unknown) => Promise<void>) => {
			const list = handlers.get(type) ?? [];
			list.push(handler);
			handlers.set(type, list);
			return () => {
				const idx = list.indexOf(handler);
				if (idx >= 0) list.splice(idx, 1);
			};
		}),
		emit: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
		listenerCount: vi.fn(() => 0),
		/** Manually fire all handlers for a given event type. */
		async fire(type: string, source: string, payload: Record<string, unknown>) {
			const list = handlers.get(type) ?? [];
			for (const handler of list) {
				await handler({ type, source, payload, timestamp: Date.now() });
			}
		},
	};
}

function createMockDb(
	modules: Record<string, string> = {},
	records: Record<
		string,
		Array<{
			entityType: string;
			entityId: string;
			data: Record<string, unknown>;
		}>
	> = {},
) {
	return {
		module: {
			findUnique: vi.fn(
				async (args: {
					where: { storeId_name: { storeId: string; name: string } };
				}) => {
					const id = modules[args.where.storeId_name.name];
					return id ? { id } : null;
				},
			),
		},
		moduleData: {
			findFirst: vi.fn(
				async (args: {
					where: {
						moduleId: string;
						entityType: string;
						entityId?: string;
					};
				}) => {
					const moduleRecords = records[args.where.moduleId] ?? [];
					return (
						moduleRecords.find(
							(r) =>
								r.entityType === args.where.entityType &&
								(!args.where.entityId || r.entityId === args.where.entityId),
						) ?? null
					);
				},
			),
			findMany: vi.fn(
				async (args: {
					where: { moduleId: string; entityType: string };
					take: number;
				}) => {
					const moduleRecords = records[args.where.moduleId] ?? [];
					return moduleRecords
						.filter((r) => r.entityType === args.where.entityType)
						.slice(0, args.take);
				},
			),
		},
	};
}

const CONFIG = {
	apiUrl: "https://dashboard.86d.app/api",
	apiKey: "test-api-key-123",
	storeId: "store-001",
};

// ── Tests ────────────────────────────────────────────────────────────

describe("registerPlatformReporter", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("OK", { status: 200 })),
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("subscribes to all mapped event types", () => {
		const bus = createMockBus();
		const db = createMockDb();

		registerPlatformReporter(bus, db, CONFIG);

		const subscribedEvents = bus.on.mock.calls.map(
			(call: unknown[]) => call[0],
		);
		expect(subscribedEvents).toContain("checkout.completed");
		expect(subscribedEvents).toContain("order.placed");
		expect(subscribedEvents).toContain("order.shipped");
		expect(subscribedEvents).toContain("order.delivered");
		expect(subscribedEvents).toContain("order.cancelled");
		expect(subscribedEvents).toContain("order.completed");
		expect(subscribedEvents).toContain("order.fulfilled");
		expect(subscribedEvents).toContain("order.refunded");
		expect(subscribedEvents).toContain("payment.completed");
		expect(subscribedEvents).toContain("payment.failed");
		expect(subscribedEvents).toContain("payment.refunded");
		expect(subscribedEvents).toContain("customer.created");
	});

	it("returns an unsubscribe function that removes all handlers", () => {
		const bus = createMockBus();
		const db = createMockDb();

		const unsubs: Array<() => void> = [];
		bus.on.mockImplementation((_type: string) => {
			const unsub = vi.fn();
			unsubs.push(unsub);
			return unsub;
		});

		const unsubAll = registerPlatformReporter(bus, db, CONFIG);
		unsubAll();

		for (const unsub of unsubs) {
			expect(unsub).toHaveBeenCalledOnce();
		}
	});

	it("ignores events not in the sync map", async () => {
		const bus = createMockBus();
		const db = createMockDb();

		registerPlatformReporter(bus, db, CONFIG);

		// Fire an event that has no mapping
		await bus.fire("some.unknown.event", "test", {});

		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("event entity resolution and reporting", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("OK", { status: 200 })),
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("resolves order entity by orderId from event payload", async () => {
		const bus = createMockBus();
		const orderData = {
			id: "ord-123",
			status: "pending",
			total: 5999,
			currency: "USD",
		};
		const db = createMockDb(
			{ orders: "mod-orders", payments: "mod-payments", customers: "mod-cust" },
			{
				"mod-orders": [
					{ entityType: "order", entityId: "ord-123", data: orderData },
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("order.placed", "orders", { orderId: "ord-123" });

		expect(fetch).toHaveBeenCalledOnce();
		const call = vi.mocked(fetch).mock.calls[0];
		expect(call[0]).toBe("https://dashboard.86d.app/api/store-events");

		const body = JSON.parse(call[1]?.body as string);
		expect(body.eventType).toBe("order.placed");
		expect(body.entities).toEqual([
			{
				module: "orders",
				entityType: "order",
				entityId: "ord-123",
				data: orderData,
			},
		]);
	});

	it("resolves multiple entity types for checkout.completed", async () => {
		const bus = createMockBus();
		const orderData = { id: "ord-1", status: "pending", total: 2000 };
		const paymentData = { id: "pi_1", status: "succeeded", amount: 2000 };
		const customerData = { id: "cust-1", email: "buyer@example.com" };

		const db = createMockDb(
			{
				orders: "mod-orders",
				payments: "mod-payments",
				customers: "mod-cust",
			},
			{
				"mod-orders": [
					{ entityType: "order", entityId: "ord-1", data: orderData },
				],
				"mod-payments": [
					{
						entityType: "paymentIntent",
						entityId: "pi_1",
						data: paymentData,
					},
				],
				"mod-cust": [
					{
						entityType: "customer",
						entityId: "cust-1",
						data: customerData,
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("checkout.completed", "checkout", {
			orderId: "ord-1",
			paymentIntentId: "pi_1",
			customerId: "cust-1",
		});

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
		expect(body.entities).toHaveLength(3);
		expect(body.entities.map((e: { module: string }) => e.module)).toEqual([
			"orders",
			"payments",
			"customers",
		]);
	});

	it("resolves refund entity for order.refunded", async () => {
		const bus = createMockBus();
		const orderData = { id: "ord-1", status: "refunded" };
		const refundData = { id: "ref-1", amount: 1000 };

		const db = createMockDb(
			{ orders: "mod-orders", payments: "mod-payments" },
			{
				"mod-orders": [
					{ entityType: "order", entityId: "ord-1", data: orderData },
				],
				"mod-payments": [
					{ entityType: "refund", entityId: "ref-1", data: refundData },
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("order.refunded", "orders", {
			orderId: "ord-1",
			refundId: "ref-1",
		});

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
		expect(body.entities).toHaveLength(2);
		expect(body.entities[0]).toMatchObject({
			module: "orders",
			entityType: "order",
			entityId: "ord-1",
		});
		expect(body.entities[1]).toMatchObject({
			module: "payments",
			entityType: "refund",
			entityId: "ref-1",
		});
	});

	it("falls back to recent entities when IDs are missing from payload", async () => {
		const bus = createMockBus();
		const recentOrders = [
			{
				entityType: "order",
				entityId: "ord-a",
				data: { id: "ord-a", total: 100 },
			},
			{
				entityType: "order",
				entityId: "ord-b",
				data: { id: "ord-b", total: 200 },
			},
		];

		const db = createMockDb(
			{ orders: "mod-orders" },
			{ "mod-orders": recentOrders },
		);

		registerPlatformReporter(bus, db, CONFIG);
		// Fire order.placed without an orderId in payload
		await bus.fire("order.placed", "orders", {});

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
		expect(body.entities).toHaveLength(2);
	});

	it("skips entities when module is not found in DB", async () => {
		const bus = createMockBus();
		// No modules registered in DB
		const db = createMockDb({}, {});

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("order.placed", "orders", { orderId: "ord-123" });

		// No entities resolved, so fetch should not be called
		expect(fetch).not.toHaveBeenCalled();
	});

	it("skips entities when record is not found by ID", async () => {
		const bus = createMockBus();
		// Module exists but no matching record
		const db = createMockDb({ orders: "mod-orders" }, { "mod-orders": [] });

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("order.placed", "orders", { orderId: "nonexistent" });

		// Entity not found, fetch not called
		expect(fetch).not.toHaveBeenCalled();
	});

	it("sends Authorization header with Bearer token", async () => {
		const bus = createMockBus();
		const db = createMockDb(
			{ orders: "mod-orders" },
			{
				"mod-orders": [
					{
						entityType: "order",
						entityId: "ord-1",
						data: { id: "ord-1" },
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("order.placed", "orders", { orderId: "ord-1" });

		const headers = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<
			string,
			string
		>;
		expect(headers.Authorization).toBe("Bearer test-api-key-123");
		expect(headers["Content-Type"]).toBe("application/json");
	});

	it("does not throw when fetch fails — logs warning instead", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("Internal Server Error", { status: 500 })),
		);

		const bus = createMockBus();
		const db = createMockDb(
			{ orders: "mod-orders" },
			{
				"mod-orders": [
					{
						entityType: "order",
						entityId: "ord-1",
						data: { id: "ord-1" },
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);

		// Should not throw
		await expect(
			bus.fire("order.placed", "orders", { orderId: "ord-1" }),
		).resolves.toBeUndefined();
	});

	it("does not throw when fetch rejects — logs warning instead", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("Network error");
			}),
		);

		const bus = createMockBus();
		const db = createMockDb(
			{ orders: "mod-orders" },
			{
				"mod-orders": [
					{
						entityType: "order",
						entityId: "ord-1",
						data: { id: "ord-1" },
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);

		await expect(
			bus.fire("order.placed", "orders", { orderId: "ord-1" }),
		).resolves.toBeUndefined();
	});

	it("does not throw when DB query fails", async () => {
		const bus = createMockBus();
		const db = createMockDb({ orders: "mod-orders" }, {});
		db.moduleData.findFirst.mockRejectedValue(new Error("DB error"));

		registerPlatformReporter(bus, db, CONFIG);

		await expect(
			bus.fire("order.placed", "orders", { orderId: "ord-1" }),
		).resolves.toBeUndefined();
	});

	it("resolves customer entity for customer.created", async () => {
		const bus = createMockBus();
		const customerData = {
			id: "cust-1",
			email: "new@example.com",
			firstName: "Jane",
		};
		const db = createMockDb(
			{ customers: "mod-cust" },
			{
				"mod-cust": [
					{
						entityType: "customer",
						entityId: "cust-1",
						data: customerData,
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("customer.created", "customers", { customerId: "cust-1" });

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
		expect(body.entities).toHaveLength(1);
		expect(body.entities[0]).toMatchObject({
			module: "customers",
			entityType: "customer",
			entityId: "cust-1",
		});
	});

	it("resolves paymentIntent for payment.completed", async () => {
		const bus = createMockBus();
		const paymentData = {
			id: "pi_abc",
			status: "succeeded",
			amount: 4999,
			currency: "USD",
		};
		const db = createMockDb(
			{ payments: "mod-pay" },
			{
				"mod-pay": [
					{
						entityType: "paymentIntent",
						entityId: "pi_abc",
						data: paymentData,
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("payment.completed", "payments", {
			paymentIntentId: "pi_abc",
		});

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
		expect(body.entities[0]).toMatchObject({
			module: "payments",
			entityType: "paymentIntent",
			entityId: "pi_abc",
			data: paymentData,
		});
	});

	it("sends to correct URL constructed from apiUrl", async () => {
		const bus = createMockBus();
		const db = createMockDb(
			{ orders: "mod-orders" },
			{
				"mod-orders": [
					{
						entityType: "order",
						entityId: "ord-1",
						data: { id: "ord-1" },
					},
				],
			},
		);

		const customConfig = {
			...CONFIG,
			apiUrl: "https://custom.dashboard.com/api",
		};
		registerPlatformReporter(bus, db, customConfig);
		await bus.fire("order.placed", "orders", { orderId: "ord-1" });

		expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
			"https://custom.dashboard.com/api/store-events",
		);
	});

	it("handles payment.refunded with both paymentIntent and refund", async () => {
		const bus = createMockBus();
		const piData = { id: "pi_1", status: "refunded", amount: 3000 };
		const refundData = { id: "ref_1", amount: 3000, status: "succeeded" };

		const db = createMockDb(
			{ payments: "mod-pay" },
			{
				"mod-pay": [
					{
						entityType: "paymentIntent",
						entityId: "pi_1",
						data: piData,
					},
					{
						entityType: "refund",
						entityId: "ref_1",
						data: refundData,
					},
				],
			},
		);

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("payment.refunded", "payments", {
			paymentIntentId: "pi_1",
			refundId: "ref_1",
		});

		expect(fetch).toHaveBeenCalledOnce();
		const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
		expect(body.entities).toHaveLength(2);
		expect(body.entities[0].entityType).toBe("paymentIntent");
		expect(body.entities[1].entityType).toBe("refund");
	});

	it("skips entities with non-object data", async () => {
		const bus = createMockBus();
		const db = createMockDb({ orders: "mod-orders" }, {});
		// Return record with null data
		db.moduleData.findFirst.mockResolvedValue({
			entityType: "order",
			entityId: "ord-1",
			data: null,
		});

		registerPlatformReporter(bus, db, CONFIG);
		await bus.fire("order.placed", "orders", { orderId: "ord-1" });

		expect(fetch).not.toHaveBeenCalled();
	});
});
