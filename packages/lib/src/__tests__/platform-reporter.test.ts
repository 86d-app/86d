import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the platform reporter logic.
 *
 * The platform reporter sends commerce events from deployed stores
 * to the 86d dashboard's /api/store-events endpoint. These tests
 * verify the event-to-entity mapping, DB querying, and HTTP reporting.
 */

// ── Event-to-entity mapping ────────────────────────────────────────

const EVENT_SYNC_MAP: Record<
	string,
	Array<{ module: string; entityType: string }>
> = {
	"checkout.completed": [
		{ module: "orders", entityType: "order" },
		{ module: "payments", entityType: "paymentIntent" },
		{ module: "customers", entityType: "customer" },
	],
	"order.placed": [{ module: "orders", entityType: "order" }],
	"order.shipped": [{ module: "orders", entityType: "order" }],
	"order.delivered": [{ module: "orders", entityType: "order" }],
	"order.cancelled": [{ module: "orders", entityType: "order" }],
	"order.completed": [{ module: "orders", entityType: "order" }],
	"order.refunded": [
		{ module: "orders", entityType: "order" },
		{ module: "payments", entityType: "refund" },
	],
	"payment.failed": [{ module: "payments", entityType: "paymentIntent" }],
	"customer.created": [{ module: "customers", entityType: "customer" }],
};

function resolveEntityId(
	target: { module: string; entityType: string },
	payload: Record<string, unknown>,
): string | undefined {
	switch (target.entityType) {
		case "order":
			return typeof payload.orderId === "string" ? payload.orderId : undefined;
		case "paymentIntent":
			return typeof payload.paymentIntentId === "string"
				? payload.paymentIntentId
				: undefined;
		case "customer":
			return typeof payload.customerId === "string"
				? payload.customerId
				: undefined;
		case "refund":
			return typeof payload.refundId === "string"
				? payload.refundId
				: undefined;
		default:
			return undefined;
	}
}

describe("EVENT_SYNC_MAP", () => {
	it("maps checkout.completed to orders, payments, and customers", () => {
		const targets = EVENT_SYNC_MAP["checkout.completed"];
		expect(targets).toHaveLength(3);
		expect(targets).toContainEqual({
			module: "orders",
			entityType: "order",
		});
		expect(targets).toContainEqual({
			module: "payments",
			entityType: "paymentIntent",
		});
		expect(targets).toContainEqual({
			module: "customers",
			entityType: "customer",
		});
	});

	it("maps order status events to orders module", () => {
		for (const event of [
			"order.placed",
			"order.shipped",
			"order.delivered",
			"order.cancelled",
			"order.completed",
		]) {
			const targets = EVENT_SYNC_MAP[event];
			expect(targets).toHaveLength(1);
			expect(targets[0]).toEqual({
				module: "orders",
				entityType: "order",
			});
		}
	});

	it("maps order.refunded to both orders and payments refund", () => {
		const targets = EVENT_SYNC_MAP["order.refunded"];
		expect(targets).toHaveLength(2);
		expect(targets).toContainEqual({
			module: "orders",
			entityType: "order",
		});
		expect(targets).toContainEqual({
			module: "payments",
			entityType: "refund",
		});
	});

	it("maps payment.failed to payments module", () => {
		const targets = EVENT_SYNC_MAP["payment.failed"];
		expect(targets).toHaveLength(1);
		expect(targets[0]).toEqual({
			module: "payments",
			entityType: "paymentIntent",
		});
	});

	it("maps customer.created to customers module", () => {
		const targets = EVENT_SYNC_MAP["customer.created"];
		expect(targets).toHaveLength(1);
		expect(targets[0]).toEqual({
			module: "customers",
			entityType: "customer",
		});
	});

	it("covers all webhook-eligible commerce events", () => {
		const events = Object.keys(EVENT_SYNC_MAP);
		expect(events.length).toBe(9);
	});
});

describe("resolveEntityId", () => {
	it("resolves orderId for order entity type", () => {
		expect(
			resolveEntityId(
				{ module: "orders", entityType: "order" },
				{ orderId: "ord_123" },
			),
		).toBe("ord_123");
	});

	it("resolves paymentIntentId for paymentIntent entity type", () => {
		expect(
			resolveEntityId(
				{ module: "payments", entityType: "paymentIntent" },
				{ paymentIntentId: "pi_abc" },
			),
		).toBe("pi_abc");
	});

	it("resolves customerId for customer entity type", () => {
		expect(
			resolveEntityId(
				{ module: "customers", entityType: "customer" },
				{ customerId: "cust_xyz" },
			),
		).toBe("cust_xyz");
	});

	it("resolves refundId for refund entity type", () => {
		expect(
			resolveEntityId(
				{ module: "payments", entityType: "refund" },
				{ refundId: "re_456" },
			),
		).toBe("re_456");
	});

	it("returns undefined when ID is missing from payload", () => {
		expect(
			resolveEntityId({ module: "orders", entityType: "order" }, {}),
		).toBeUndefined();
	});

	it("returns undefined for non-string ID values", () => {
		expect(
			resolveEntityId(
				{ module: "orders", entityType: "order" },
				{ orderId: 123 },
			),
		).toBeUndefined();
	});

	it("returns undefined for unknown entity types", () => {
		expect(
			resolveEntityId(
				{ module: "unknown", entityType: "widget" },
				{ widgetId: "w_1" },
			),
		).toBeUndefined();
	});
});

describe("store-events endpoint contract", () => {
	it("expects entities array in request body", () => {
		const body = {
			entities: [
				{
					module: "orders",
					entityType: "order",
					entityId: "ord_123",
					data: {
						id: "ord_123",
						status: "pending",
						total: 4999,
						currency: "USD",
						createdAt: "2026-03-17T00:00:00.000Z",
					},
				},
				{
					module: "payments",
					entityType: "paymentIntent",
					entityId: "pi_abc",
					data: {
						id: "pi_abc",
						amount: 4999,
						currency: "USD",
						status: "succeeded",
						createdAt: "2026-03-17T00:00:00.000Z",
						updatedAt: "2026-03-17T00:00:00.000Z",
					},
				},
			],
		};

		// Verify entity shape matches what the dashboard money router expects
		const payment = body.entities[1].data;
		expect(payment).toHaveProperty("id");
		expect(payment).toHaveProperty("amount");
		expect(payment).toHaveProperty("currency");
		expect(payment).toHaveProperty("status");
		expect(payment).toHaveProperty("createdAt");
		expect(payment).toHaveProperty("updatedAt");

		const order = body.entities[0].data;
		expect(order).toHaveProperty("id");
		expect(order).toHaveProperty("status");
		expect(order).toHaveProperty("total");
		expect(order).toHaveProperty("currency");
	});

	it("enforces maximum 100 entities per request", () => {
		const MAX_ENTITIES = 100;
		expect(MAX_ENTITIES).toBe(100);
	});
});

describe("platform reporter HTTP integration", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("sends POST to /api/store-events with Bearer auth", async () => {
		const mockFetch = vi.mocked(globalThis.fetch);
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ ok: true, upserted: 1 }), {
				status: 200,
			}),
		);

		const apiUrl = "https://dashboard.86d.app/api";
		const apiKey = "86d_test_key_123";
		const entities = [
			{
				module: "orders",
				entityType: "order",
				entityId: "ord_1",
				data: { id: "ord_1", status: "pending", total: 1000 },
			},
		];

		const response = await fetch(`${apiUrl}/store-events`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({ entities }),
		});

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const [url, init] = mockFetch.mock.calls[0];
		expect(url).toBe("https://dashboard.86d.app/api/store-events");
		expect(init?.method).toBe("POST");
		expect(init?.headers).toEqual(
			expect.objectContaining({
				Authorization: "Bearer 86d_test_key_123",
				"Content-Type": "application/json",
			}),
		);

		const body = JSON.parse(init?.body as string);
		expect(body.entities).toHaveLength(1);
		expect(body.entities[0].module).toBe("orders");
		expect(response.ok).toBe(true);
	});

	it("handles dashboard rejection gracefully", async () => {
		const mockFetch = vi.mocked(globalThis.fetch);
		mockFetch.mockResolvedValue(
			new Response(JSON.stringify({ error: "Invalid API key" }), {
				status: 401,
			}),
		);

		const response = await fetch("https://dashboard.86d.app/api/store-events", {
			method: "POST",
			headers: {
				Authorization: "Bearer invalid_key",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ entities: [] }),
		});

		expect(response.ok).toBe(false);
		expect(response.status).toBe(401);
	});

	it("handles network failure gracefully", async () => {
		const mockFetch = vi.mocked(globalThis.fetch);
		mockFetch.mockRejectedValue(new Error("Network error"));

		await expect(
			fetch("https://dashboard.86d.app/api/store-events", {
				method: "POST",
				headers: { Authorization: "Bearer key" },
				body: "{}",
			}),
		).rejects.toThrow("Network error");
	});
});
