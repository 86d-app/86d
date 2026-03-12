import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import type { CreateAbandonedCartParams } from "../service";
import { createAbandonedCartController } from "../service-impl";

/**
 * Security regression tests for abandoned-carts endpoints.
 *
 * Abandoned carts contain PII (email, cart contents, customer IDs).
 * These tests verify:
 * - Recovery token isolation: tokens are unique and scoped
 * - Status transition integrity: recovered/expired carts can't be re-abused
 * - Email scoping: list filters don't leak across customers
 * - Cascade delete: no orphaned recovery attempts
 * - Bulk expire safety: only affects active carts
 */

function makeCartParams(
	overrides: Partial<CreateAbandonedCartParams> = {},
): CreateAbandonedCartParams {
	return {
		cartId: `cart_${crypto.randomUUID().slice(0, 8)}`,
		items: [
			{
				productId: "prod_1",
				name: "Widget",
				price: 2500,
				quantity: 1,
			},
		],
		cartTotal: 2500,
		...overrides,
	};
}

describe("abandoned-carts endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createAbandonedCartController>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createAbandonedCartController(mockData);
	});

	// ── Recovery Token Security ────────────────────────────────────

	describe("recovery token isolation", () => {
		it("each abandoned cart gets a unique recovery token", async () => {
			const cart1 = await controller.create(
				makeCartParams({ email: "a@test.com" }),
			);
			const cart2 = await controller.create(
				makeCartParams({ email: "b@test.com" }),
			);

			expect(cart1.recoveryToken).not.toBe(cart2.recoveryToken);
		});

		it("getByToken returns only the matching cart", async () => {
			const cart1 = await controller.create(
				makeCartParams({ email: "a@test.com" }),
			);
			await controller.create(makeCartParams({ email: "b@test.com" }));

			const found = await controller.getByToken(cart1.recoveryToken);
			expect(found).not.toBeNull();
			expect(found?.email).toBe("a@test.com");
		});

		it("invalid token returns null", async () => {
			await controller.create(makeCartParams());

			const found = await controller.getByToken("invalid-token-uuid");
			expect(found).toBeNull();
		});
	});

	// ── Status Transition Integrity ────────────────────────────────

	describe("status transition integrity", () => {
		it("recovered cart records orderId and timestamp", async () => {
			const cart = await controller.create(makeCartParams());

			const recovered = await controller.markRecovered(cart.id, "order_123");
			expect(recovered?.status).toBe("recovered");
			expect(recovered?.recoveredOrderId).toBe("order_123");
			expect(recovered?.recoveredAt).toBeDefined();
		});

		it("expired cart preserves original data", async () => {
			const cart = await controller.create(
				makeCartParams({
					email: "user@test.com",
					cartTotal: 5000,
				}),
			);

			const expired = await controller.markExpired(cart.id);
			expect(expired?.status).toBe("expired");
			expect(expired?.email).toBe("user@test.com");
			expect(expired?.cartTotal).toBe(5000);
		});

		it("dismissed cart preserves items snapshot", async () => {
			const items = [
				{ productId: "p1", name: "A", price: 1000, quantity: 2 },
				{ productId: "p2", name: "B", price: 500, quantity: 1 },
			];
			const cart = await controller.create(
				makeCartParams({ items, cartTotal: 2500 }),
			);

			const dismissed = await controller.dismiss(cart.id);
			expect(dismissed?.status).toBe("dismissed");
			expect(dismissed?.items).toHaveLength(2);
		});

		it("non-existent cart returns null on status transitions", async () => {
			expect(await controller.markRecovered("nonexistent", "order")).toBeNull();
			expect(await controller.markExpired("nonexistent")).toBeNull();
			expect(await controller.dismiss("nonexistent")).toBeNull();
		});
	});

	// ── Email Scoping ──────────────────────────────────────────────

	describe("email-based list filtering", () => {
		it("list with email filter only returns matching carts", async () => {
			await controller.create(makeCartParams({ email: "alice@test.com" }));
			await controller.create(makeCartParams({ email: "bob@test.com" }));
			await controller.create(makeCartParams({ email: "alice@test.com" }));

			const aliceCarts = await controller.list({ email: "alice@test.com" });
			expect(aliceCarts).toHaveLength(2);
			for (const cart of aliceCarts) {
				expect(cart.email).toBe("alice@test.com");
			}
		});

		it("list with status filter scopes correctly", async () => {
			const cart1 = await controller.create(makeCartParams());
			const cart2 = await controller.create(makeCartParams());
			await controller.markRecovered(cart1.id, "order_1");

			const activeCarts = await controller.list({ status: "active" });
			expect(activeCarts).toHaveLength(1);
			expect(activeCarts[0].id).toBe(cart2.id);
		});
	});

	// ── Cascade Delete ─────────────────────────────────────────────

	describe("cascade delete integrity", () => {
		it("deleting cart removes all recovery attempts", async () => {
			const cart = await controller.create(
				makeCartParams({ email: "user@test.com" }),
			);

			await controller.recordAttempt({
				abandonedCartId: cart.id,
				channel: "email",
				recipient: "user@test.com",
			});
			await controller.recordAttempt({
				abandonedCartId: cart.id,
				channel: "sms",
				recipient: "+1234567890",
			});

			const attemptsBefore = await controller.listAttempts(cart.id);
			expect(attemptsBefore).toHaveLength(2);

			await controller.delete(cart.id);

			// Cart gone
			expect(await controller.get(cart.id)).toBeNull();

			// Attempts also gone
			const attemptsAfter = await controller.listAttempts(cart.id);
			expect(attemptsAfter).toHaveLength(0);
		});

		it("deleting one cart does not affect another cart's attempts", async () => {
			const cart1 = await controller.create(makeCartParams());
			const cart2 = await controller.create(makeCartParams());

			await controller.recordAttempt({
				abandonedCartId: cart1.id,
				channel: "email",
				recipient: "a@test.com",
			});
			await controller.recordAttempt({
				abandonedCartId: cart2.id,
				channel: "email",
				recipient: "b@test.com",
			});

			await controller.delete(cart1.id);

			const cart2Attempts = await controller.listAttempts(cart2.id);
			expect(cart2Attempts).toHaveLength(1);
		});
	});

	// ── Bulk Expire Safety ─────────────────────────────────────────

	describe("bulk expire safety", () => {
		it("only expires active carts older than threshold", async () => {
			const active = await controller.create(makeCartParams());
			const recovered = await controller.create(makeCartParams());
			await controller.markRecovered(recovered.id, "order_1");

			// Manually backdate the active cart's abandonedAt to 10 days ago
			// so it qualifies for expiration
			const old = await controller.get(active.id);
			const tenDaysAgo = new Date();
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
			await mockData.upsert("abandonedCart", active.id, {
				...old,
				abandonedAt: tenDaysAgo,
			} as Record<string, unknown>);

			const expired = await controller.bulkExpire(5);
			expect(expired).toBe(1);

			// Active cart should be expired
			const activeNow = await controller.get(active.id);
			expect(activeNow?.status).toBe("expired");

			// Recovered cart should remain recovered
			const recoveredNow = await controller.get(recovered.id);
			expect(recoveredNow?.status).toBe("recovered");
		});

		it("already dismissed carts are not affected by bulk expire", async () => {
			const cart = await controller.create(makeCartParams());
			await controller.dismiss(cart.id);

			// Backdate so it's old enough
			const old = await controller.get(cart.id);
			const tenDaysAgo = new Date();
			tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
			await mockData.upsert("abandonedCart", cart.id, {
				...old,
				abandonedAt: tenDaysAgo,
			} as Record<string, unknown>);

			const expiredCount = await controller.bulkExpire(5);
			expect(expiredCount).toBe(0);

			const result = await controller.get(cart.id);
			expect(result?.status).toBe("dismissed");
		});
	});

	// ── Recovery Attempt Tracking ──────────────────────────────────

	describe("recovery attempt tracking", () => {
		it("attempt count increments correctly", async () => {
			const cart = await controller.create(makeCartParams());

			await controller.recordAttempt({
				abandonedCartId: cart.id,
				channel: "email",
				recipient: "user@test.com",
			});

			const after1 = await controller.get(cart.id);
			expect(after1?.attemptCount).toBe(1);

			await controller.recordAttempt({
				abandonedCartId: cart.id,
				channel: "sms",
				recipient: "+1234567890",
			});

			const after2 = await controller.get(cart.id);
			expect(after2?.attemptCount).toBe(2);
		});

		it("attempt status transitions preserve timestamps", async () => {
			const cart = await controller.create(makeCartParams());

			const attempt = await controller.recordAttempt({
				abandonedCartId: cart.id,
				channel: "email",
				recipient: "user@test.com",
			});

			const opened = await controller.updateAttemptStatus(attempt.id, "opened");
			expect(opened?.openedAt).toBeDefined();
			expect(opened?.status).toBe("opened");

			// Second "opened" should not overwrite timestamp
			const openedAgain = await controller.updateAttemptStatus(
				attempt.id,
				"opened",
			);
			expect(openedAgain?.openedAt).toEqual(opened?.openedAt);
		});

		it("clicked also records clickedAt on first transition", async () => {
			const cart = await controller.create(makeCartParams());

			const attempt = await controller.recordAttempt({
				abandonedCartId: cart.id,
				channel: "email",
				recipient: "user@test.com",
			});

			const clicked = await controller.updateAttemptStatus(
				attempt.id,
				"clicked",
			);
			expect(clicked?.clickedAt).toBeDefined();
			expect(clicked?.status).toBe("clicked");
		});
	});

	// ── Stats Integrity ────────────────────────────────────────────

	describe("stats integrity", () => {
		it("stats accurately reflect all status categories", async () => {
			const c1 = await controller.create(makeCartParams({ cartTotal: 1000 }));
			const c2 = await controller.create(makeCartParams({ cartTotal: 2000 }));
			const c3 = await controller.create(makeCartParams({ cartTotal: 3000 }));
			await controller.create(makeCartParams({ cartTotal: 4000 }));

			await controller.markRecovered(c1.id, "order_1");
			await controller.markExpired(c2.id);
			await controller.dismiss(c3.id);
			// fourth cart remains active

			const stats = await controller.getStats();
			expect(stats.totalAbandoned).toBe(1);
			expect(stats.totalRecovered).toBe(1);
			expect(stats.totalExpired).toBe(1);
			expect(stats.totalDismissed).toBe(1);
			expect(stats.totalRecoveredValue).toBe(1000);
			expect(stats.recoveryRate).toBe(0.25);
		});

		it("empty store returns zero stats", async () => {
			const stats = await controller.getStats();
			expect(stats.totalAbandoned).toBe(0);
			expect(stats.totalRecovered).toBe(0);
			expect(stats.recoveryRate).toBe(0);
			expect(stats.totalRecoveredValue).toBe(0);
		});
	});
});
