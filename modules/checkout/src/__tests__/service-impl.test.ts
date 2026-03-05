import { createMockDataService } from "@86d-app/core/test-utils";
import { describe, expect, it } from "vitest";
import type { CheckoutLineItem } from "../service";
import { createCheckoutController } from "../service-impl";

const sampleLineItems: CheckoutLineItem[] = [
	{ productId: "p1", name: "Widget", price: 1000, quantity: 2 },
	{
		productId: "p2",
		variantId: "v1",
		name: "Gadget S",
		sku: "GAD-S",
		price: 2000,
		quantity: 1,
	},
];

function makeSession(overrides: Record<string, unknown> = {}) {
	return {
		subtotal: 4000,
		taxAmount: 400,
		shippingAmount: 500,
		total: 4900,
		lineItems: sampleLineItems,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

describe("create", () => {
	it("creates a session with correct defaults", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());

		expect(session.status).toBe("pending");
		expect(session.currency).toBe("USD");
		expect(session.discountAmount).toBe(0);
		expect(session.subtotal).toBe(4000);
		expect(session.total).toBe(4900);
		expect(session.expiresAt).toBeInstanceOf(Date);
		expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
	});

	it("accepts optional fields (customerId, guestEmail, cartId)", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				customerId: "cust-1",
				guestEmail: "a@b.com",
				cartId: "cart-1",
			}),
		);
		expect(session.customerId).toBe("cust-1");
		expect(session.guestEmail).toBe("a@b.com");
		expect(session.cartId).toBe("cart-1");
	});

	it("stores line items retrievable via getLineItems", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const items = await ctrl.getLineItems(session.id);

		expect(items).toHaveLength(2);
		expect(items[0].productId).toBe("p1");
		expect(items[1].productId).toBe("p2");
		expect(items[1].variantId).toBe("v1");
		// sessionId must NOT leak through
		expect(items[0]).not.toHaveProperty("sessionId");
	});
});

// ---------------------------------------------------------------------------
// getById
// ---------------------------------------------------------------------------

describe("getById", () => {
	it("returns null for missing session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		expect(await ctrl.getById("nope")).toBeNull();
	});

	it("returns the session when it exists", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const created = await ctrl.create(makeSession());
		const fetched = await ctrl.getById(created.id);
		expect(fetched?.id).toBe(created.id);
		expect(fetched?.status).toBe("pending");
	});
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("update", () => {
	it("updates guestEmail and address", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.update(session.id, {
			guestEmail: "guest@example.com",
			shippingAddress: {
				firstName: "Jane",
				lastName: "Doe",
				line1: "1 Main St",
				city: "Springfield",
				state: "IL",
				postalCode: "62701",
				country: "US",
			},
		});

		expect(updated?.guestEmail).toBe("guest@example.com");
		expect(updated?.shippingAddress?.city).toBe("Springfield");
		// unchanged fields preserved
		expect(updated?.subtotal).toBe(4000);
	});

	it("recalculates total when shippingAmount changes", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// subtotal=4000 tax=400 shipping=500 → total=4900
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.update(session.id, { shippingAmount: 1000 });

		// 4000 + 400 + 1000 - 0 = 5400
		expect(updated?.shippingAmount).toBe(1000);
		expect(updated?.total).toBe(5400);
	});

	it("returns null for a completed session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.complete(session.id, "order-1");
		const result = await ctrl.update(session.id, { guestEmail: "x@y.com" });
		expect(result).toBeNull();
	});

	it("returns null for a missing session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		expect(await ctrl.update("ghost", { guestEmail: "a@b.com" })).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// applyDiscount / removeDiscount
// ---------------------------------------------------------------------------

describe("applyDiscount", () => {
	it("applies a fixed discount and recalculates total", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// subtotal=4000 tax=400 shipping=500 total=4900
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.applyDiscount(session.id, {
			code: "SAVE500",
			discountAmount: 500,
			freeShipping: false,
		});

		expect(updated?.discountCode).toBe("SAVE500");
		expect(updated?.discountAmount).toBe(500);
		// 4000 + 400 + 500 - 500 = 4400
		expect(updated?.total).toBe(4400);
	});

	it("applies free shipping (sets shippingAmount to 0)", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.applyDiscount(session.id, {
			code: "FREESHIP",
			discountAmount: 0,
			freeShipping: true,
		});

		expect(updated?.shippingAmount).toBe(0);
		// 4000 + 400 + 0 - 0 = 4400
		expect(updated?.total).toBe(4400);
	});

	it("clamps total to zero (no negative totals)", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const updated = await ctrl.applyDiscount(session.id, {
			code: "BIG",
			discountAmount: 99999,
			freeShipping: false,
		});

		expect(updated?.total).toBe(0);
	});

	it("returns null for a completed session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.complete(session.id, "order-1");
		const result = await ctrl.applyDiscount(session.id, {
			code: "X",
			discountAmount: 100,
			freeShipping: false,
		});
		expect(result).toBeNull();
	});
});

describe("removeDiscount", () => {
	it("removes discount and restores original total", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.applyDiscount(session.id, {
			code: "SAVE500",
			discountAmount: 500,
			freeShipping: false,
		});
		const restored = await ctrl.removeDiscount(session.id);

		expect(restored?.discountCode).toBeUndefined();
		expect(restored?.discountAmount).toBe(0);
		// subtotal=4000 + tax=400 + shipping=500 = 4900
		expect(restored?.total).toBe(4900);
	});

	it("returns null for missing session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		expect(await ctrl.removeDiscount("nope")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// confirm
// ---------------------------------------------------------------------------

const sampleAddress = {
	firstName: "Jane",
	lastName: "Doe",
	line1: "1 Main St",
	city: "Springfield",
	state: "IL",
	postalCode: "62701",
	country: "US",
};

describe("confirm", () => {
	it("transitions a valid pending session to processing", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				customerId: "cust-1",
				shippingAddress: sampleAddress,
			}),
		);

		const result = await ctrl.confirm(session.id);
		expect("session" in result).toBe(true);
		if ("session" in result) {
			expect(result.session.status).toBe("processing");
		}
	});

	it("accepts guestEmail as customer identification", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				guestEmail: "guest@example.com",
				shippingAddress: sampleAddress,
			}),
		);

		const result = await ctrl.confirm(session.id);
		expect("session" in result).toBe(true);
	});

	it("returns error when session not found", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const result = await ctrl.confirm("nonexistent");
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.status).toBe(404);
		}
	});

	it("returns error for non-pending session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				customerId: "cust-1",
				shippingAddress: sampleAddress,
			}),
		);
		await ctrl.confirm(session.id); // now processing

		const result = await ctrl.confirm(session.id);
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.status).toBe(422);
			expect(result.error).toContain("processing");
		}
	});

	it("returns error when no customer identification", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				shippingAddress: sampleAddress,
			}),
		);

		const result = await ctrl.confirm(session.id);
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.status).toBe(422);
			expect(result.error).toContain("Customer ID or guest email");
		}
	});

	it("returns error when no shipping address", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				customerId: "cust-1",
			}),
		);

		const result = await ctrl.confirm(session.id);
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.status).toBe(422);
			expect(result.error).toContain("Shipping address");
		}
	});

	it("returns error when no line items", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create({
			subtotal: 0,
			total: 0,
			lineItems: [],
			customerId: "cust-1",
			shippingAddress: sampleAddress,
		});

		const result = await ctrl.confirm(session.id);
		expect("error" in result).toBe(true);
		if ("error" in result) {
			expect(result.status).toBe(422);
			expect(result.error).toContain("no line items");
		}
	});
});

// ---------------------------------------------------------------------------
// complete
// ---------------------------------------------------------------------------

describe("complete", () => {
	it("marks a pending session as completed and stores orderId", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const completed = await ctrl.complete(session.id, "order-abc");

		expect(completed?.status).toBe("completed");
		expect(completed?.orderId).toBe("order-abc");
	});

	it("marks a processing session as completed", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				customerId: "cust-1",
				shippingAddress: sampleAddress,
			}),
		);
		await ctrl.confirm(session.id);
		const completed = await ctrl.complete(session.id, "order-xyz");

		expect(completed?.status).toBe("completed");
		expect(completed?.orderId).toBe("order-xyz");
	});

	it("returns null if already completed", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.complete(session.id, "order-1");
		expect(await ctrl.complete(session.id, "order-2")).toBeNull();
	});

	it("returns null for missing session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		expect(await ctrl.complete("nope", "order-1")).toBeNull();
	});

	it("returns null for expired session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession({ ttl: -1 }));
		await ctrl.expireStale();
		expect(await ctrl.complete(session.id, "order-1")).toBeNull();
	});

	it("returns null for abandoned session", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.abandon(session.id);
		expect(await ctrl.complete(session.id, "order-1")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// abandon
// ---------------------------------------------------------------------------

describe("abandon", () => {
	it("marks a pending session as abandoned", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		const abandoned = await ctrl.abandon(session.id);

		expect(abandoned?.status).toBe("abandoned");
	});

	it("returns null if session is already completed", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession());
		await ctrl.complete(session.id, "order-1");
		expect(await ctrl.abandon(session.id)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// expireStale
// ---------------------------------------------------------------------------

describe("expireStale", () => {
	it("expires pending sessions past their TTL", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// Create one already-expired session (negative TTL → expiresAt is in the past)
		await ctrl.create(makeSession({ ttl: -60_000 }));
		// Create one fresh session (TTL 1 hour)
		await ctrl.create(makeSession({ ttl: 60 * 60 * 1000 }));

		const result = await ctrl.expireStale();
		expect(result.expired).toBe(1);
		expect(result.processingSessions).toHaveLength(0);
	});

	it("expires processing sessions past their TTL and returns them", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		// Create and confirm a session with short TTL
		const session = await ctrl.create(
			makeSession({
				ttl: -60_000,
				customerId: "cust-1",
				shippingAddress: sampleAddress,
			}),
		);
		await ctrl.confirm(session.id);

		const result = await ctrl.expireStale();
		expect(result.expired).toBe(1);
		expect(result.processingSessions).toHaveLength(1);
		expect(result.processingSessions[0].id).toBe(session.id);
	});

	it("expires both pending and processing sessions", async () => {
		const ctrl = createCheckoutController(createMockDataService());

		// Expired pending session
		await ctrl.create(makeSession({ ttl: -60_000 }));

		// Expired processing session
		const processing = await ctrl.create(
			makeSession({
				ttl: -60_000,
				customerId: "cust-1",
				shippingAddress: sampleAddress,
			}),
		);
		await ctrl.confirm(processing.id);

		// Fresh pending session (should NOT expire)
		await ctrl.create(makeSession({ ttl: 60 * 60 * 1000 }));

		const result = await ctrl.expireStale();
		expect(result.expired).toBe(2);
		expect(result.processingSessions).toHaveLength(1);
	});

	it("does not expire completed sessions", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession({ ttl: 0 }));
		await ctrl.complete(session.id, "order-1");

		const result = await ctrl.expireStale();
		expect(result.expired).toBe(0);
		expect(result.processingSessions).toHaveLength(0);
	});

	it("does not expire abandoned sessions", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession({ ttl: -60_000 }));
		await ctrl.abandon(session.id);

		const result = await ctrl.expireStale();
		expect(result.expired).toBe(0);
	});

	it("returns 0 when nothing is stale", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		await ctrl.create(makeSession({ ttl: 60 * 60 * 1000 }));
		const result = await ctrl.expireStale();
		expect(result.expired).toBe(0);
		expect(result.processingSessions).toHaveLength(0);
	});

	it("sets status to expired and persists the change", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(makeSession({ ttl: -60_000 }));

		await ctrl.expireStale();
		const fetched = await ctrl.getById(session.id);
		expect(fetched?.status).toBe("expired");
	});

	it("sets status to expired for processing sessions", async () => {
		const ctrl = createCheckoutController(createMockDataService());
		const session = await ctrl.create(
			makeSession({
				ttl: -60_000,
				customerId: "cust-1",
				shippingAddress: sampleAddress,
			}),
		);
		await ctrl.confirm(session.id);

		await ctrl.expireStale();
		const fetched = await ctrl.getById(session.id);
		expect(fetched?.status).toBe("expired");
	});
});
