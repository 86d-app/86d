import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createCheckoutController } from "../service-impl";

/**
 * Security regression tests for checkout endpoints.
 *
 * Checkout sessions contain PII (email, addresses, payment info).
 * These tests verify:
 * - Customer isolation: sessions scoped by customerId
 * - Status transitions: completed/expired sessions reject modifications
 * - Discount/gift card integrity on terminal sessions
 * - Line item isolation per session
 * - Stale session expiration safety
 */

const VALID_ADDRESS = {
	firstName: "Ada",
	lastName: "Lovelace",
	line1: "123 Main St",
	city: "London",
	state: "ENG",
	postalCode: "SW1A 1AA",
	country: "GB",
};

function makeSession(
	controller: ReturnType<typeof createCheckoutController>,
	overrides: {
		customerId?: string;
		guestEmail?: string;
		subtotal?: number;
		total?: number;
		shippingAddress?: typeof VALID_ADDRESS;
		lineItems?: Array<{
			productId: string;
			name: string;
			price: number;
			quantity: number;
			variantId?: string;
		}>;
		ttl?: number;
	} = {},
) {
	return controller.create({
		cartId: `cart_${crypto.randomUUID().slice(0, 8)}`,
		customerId: overrides.customerId ?? "cust_default",
		guestEmail: overrides.guestEmail,
		subtotal: overrides.subtotal ?? 5000,
		total: overrides.total ?? 5000,
		shippingAddress: overrides.shippingAddress,
		lineItems: overrides.lineItems ?? [
			{ productId: "prod_1", name: "Widget", price: 2500, quantity: 2 },
		],
		ttl: overrides.ttl,
	});
}

describe("checkout endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createCheckoutController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createCheckoutController(mockData);
	});

	// -- Customer Isolation ------------------------------------------------

	describe("customer isolation", () => {
		it("sessions created for different customers have distinct IDs and ownership", async () => {
			const s1 = await makeSession(controller, {
				customerId: "cust_alice",
			});
			const s2 = await makeSession(controller, {
				customerId: "cust_bob",
			});

			expect(s1.id).not.toBe(s2.id);
			expect(s1.customerId).toBe("cust_alice");
			expect(s2.customerId).toBe("cust_bob");
		});

		it("getById exposes customerId so callers can verify ownership", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_alice",
			});

			const fetched = await controller.getById(session.id);
			expect(fetched).not.toBeNull();
			expect(fetched?.customerId).toBe("cust_alice");
		});

		it("listSessions search scopes results by customerId text match", async () => {
			await makeSession(controller, { customerId: "cust_alice" });
			await makeSession(controller, { customerId: "cust_bob" });
			await makeSession(controller, { customerId: "cust_alice" });

			const result = await controller.listSessions({
				search: "cust_alice",
			});
			expect(result.total).toBe(2);
			for (const s of result.sessions) {
				expect(s.customerId).toBe("cust_alice");
			}
		});
	});

	// -- Status Transitions ------------------------------------------------

	describe("status-based access control", () => {
		it("completed session rejects update attempts", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_123");

			const result = await controller.update(session.id, {
				guestEmail: "hacker@evil.com",
			});
			expect(result).toBeNull();

			const fetched = await controller.getById(session.id);
			expect(fetched?.status).toBe("completed");
			expect(fetched?.guestEmail).toBeUndefined();
		});

		it("expired session rejects update attempts", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				ttl: 1,
			});
			// Force expiry by manipulating the stored record
			const stored = await controller.getById(session.id);
			if (stored) {
				const expired = {
					...stored,
					status: "expired" as const,
					expiresAt: new Date(Date.now() - 60_000),
				};
				await mockData.upsert(
					"checkoutSession",
					session.id,
					expired as Record<string, unknown>,
				);
			}

			const result = await controller.update(session.id, {
				guestEmail: "hacker@evil.com",
			});
			expect(result).toBeNull();
		});

		it("confirm rejects already-completed sessions with descriptive error", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.confirm(session.id);
			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.status).toBe(422);
				expect(result.error).toContain("completed");
			}
		});

		it("confirm on non-existent session returns 404 error", async () => {
			const result = await controller.confirm("nonexistent_id");
			expect("error" in result).toBe(true);
			if ("error" in result) {
				expect(result.status).toBe(404);
			}
		});

		it("completed session cannot be abandoned", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.abandon(session.id);
			expect(result).toBeNull();

			const fetched = await controller.getById(session.id);
			expect(fetched?.status).toBe("completed");
		});

		it("completed session rejects setPaymentIntent", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.setPaymentIntent(
				session.id,
				"pi_malicious",
				"succeeded",
			);
			expect(result).toBeNull();
		});
	});

	// -- Discount Integrity ------------------------------------------------

	describe("discount and gift card integrity", () => {
		it("applying discount to completed session returns null", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.applyDiscount(session.id, {
				code: "STEAL50",
				discountAmount: 5000,
				freeShipping: false,
			});
			expect(result).toBeNull();

			const fetched = await controller.getById(session.id);
			expect(fetched?.discountCode).toBeUndefined();
			expect(fetched?.discountAmount).toBe(0);
		});

		it("applying gift card to completed session returns null", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.applyGiftCard(session.id, {
				code: "GC_STOLEN",
				giftCardAmount: 9999,
			});
			expect(result).toBeNull();

			const fetched = await controller.getById(session.id);
			expect(fetched?.giftCardCode).toBeUndefined();
		});

		it("removeDiscount on completed session returns null", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
			});
			await controller.applyDiscount(session.id, {
				code: "SAVE10",
				discountAmount: 1000,
				freeShipping: false,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.removeDiscount(session.id);
			expect(result).toBeNull();

			const fetched = await controller.getById(session.id);
			expect(fetched?.discountCode).toBe("SAVE10");
		});

		it("removeGiftCard on completed session returns null", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
			});
			await controller.applyGiftCard(session.id, {
				code: "GC_VALID",
				giftCardAmount: 2000,
			});
			await controller.complete(session.id, "order_1");

			const result = await controller.removeGiftCard(session.id);
			expect(result).toBeNull();

			const fetched = await controller.getById(session.id);
			expect(fetched?.giftCardCode).toBe("GC_VALID");
		});
	});

	// -- Line Item Isolation -----------------------------------------------

	describe("line item isolation", () => {
		it("line items are scoped to their session and do not leak", async () => {
			const s1 = await makeSession(controller, {
				customerId: "cust_1",
				lineItems: [
					{ productId: "prod_a", name: "Alpha", price: 1000, quantity: 1 },
				],
			});
			const s2 = await makeSession(controller, {
				customerId: "cust_2",
				lineItems: [
					{ productId: "prod_b", name: "Beta", price: 2000, quantity: 3 },
				],
			});

			const items1 = await controller.getLineItems(s1.id);
			const items2 = await controller.getLineItems(s2.id);

			expect(items1).toHaveLength(1);
			expect(items1[0].productId).toBe("prod_a");
			expect(items2).toHaveLength(1);
			expect(items2[0].productId).toBe("prod_b");
		});

		it("getLineItems for non-existent session returns empty array", async () => {
			const items = await controller.getLineItems("nonexistent_session");
			expect(items).toHaveLength(0);
		});
	});

	// -- Session Expiry Safety ---------------------------------------------

	describe("session expiry safety", () => {
		it("expireStale expires only pending/processing sessions past TTL", async () => {
			// Create a session with very short TTL and force its expiresAt to the past
			const pending = await makeSession(controller, {
				customerId: "cust_1",
				ttl: 1,
			});
			const stored = await controller.getById(pending.id);
			if (stored) {
				const pastExpiry = {
					...stored,
					expiresAt: new Date(Date.now() - 60_000),
				};
				await mockData.upsert(
					"checkoutSession",
					pending.id,
					pastExpiry as Record<string, unknown>,
				);
			}

			const result = await controller.expireStale();
			expect(result.expired).toBeGreaterThanOrEqual(1);

			const fetched = await controller.getById(pending.id);
			expect(fetched?.status).toBe("expired");
		});

		it("expireStale does not expire completed sessions", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});
			await controller.complete(session.id, "order_done");

			// Force expiresAt into the past on the completed session
			const stored = await controller.getById(session.id);
			if (stored) {
				const pastExpiry = {
					...stored,
					expiresAt: new Date(Date.now() - 60_000),
				};
				await mockData.upsert(
					"checkoutSession",
					session.id,
					pastExpiry as Record<string, unknown>,
				);
			}

			await controller.expireStale();
			// The completed session should NOT be touched
			const fetched = await controller.getById(session.id);
			expect(fetched?.status).toBe("completed");
			expect(fetched?.orderId).toBe("order_done");
		});

		it("expireStale reports processing sessions for inventory cleanup", async () => {
			const session = await makeSession(controller, {
				customerId: "cust_1",
				shippingAddress: VALID_ADDRESS,
			});

			// Force session into processing status with expired TTL
			const stored = await controller.getById(session.id);
			if (stored) {
				const processing = {
					...stored,
					status: "processing" as const,
					expiresAt: new Date(Date.now() - 60_000),
				};
				await mockData.upsert(
					"checkoutSession",
					session.id,
					processing as Record<string, unknown>,
				);
			}

			const result = await controller.expireStale();
			expect(result.expired).toBeGreaterThanOrEqual(1);
			expect(result.processingSessions.length).toBeGreaterThanOrEqual(1);
			expect(result.processingSessions[0].id).toBe(session.id);
		});
	});
});
