import { createMockDataService } from "@86d-app/core/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createCartControllers } from "../service-impl";

/**
 * Security regression tests for cart endpoints.
 *
 * Cart contains pre-purchase data with customer/guest isolation.
 * These tests verify:
 * - Customer/guest cart isolation: separate carts per identity
 * - Item ownership: items belong to a specific cart
 * - Cart total isolation: totals reflect only their own items
 * - Clear cart safety: clearing one cart does not affect others
 * - Abandoned cart stats don't leak cross-customer data
 * - Recovery email tracking is scoped per cart
 */

describe("cart endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createCartControllers>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createCartControllers(mockData);
	});

	// ── Cart Isolation ─────────────────────────────────────────────

	describe("customer/guest cart isolation", () => {
		it("different customers get different carts", async () => {
			const cart1 = await controller.getOrCreateCart({
				customerId: "cust_1",
			});
			const cart2 = await controller.getOrCreateCart({
				customerId: "cust_2",
			});

			expect(cart1.id).not.toBe(cart2.id);
		});

		it("same customer gets the same cart on repeated calls", async () => {
			const cart1 = await controller.getOrCreateCart({
				customerId: "cust_1",
			});
			const cart2 = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			expect(cart1.id).toBe(cart2.id);
		});

		it("guest cart is separate from customer cart", async () => {
			const guestCart = await controller.getOrCreateCart({
				guestId: "guest_1",
			});
			const customerCart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			expect(guestCart.id).not.toBe(customerCart.id);
		});
	});

	// ── Item Isolation ─────────────────────────────────────────────

	describe("cart item isolation", () => {
		it("items added to cart A do not appear in cart B", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 1000,
				quantity: 1,
			});

			const itemsA = await controller.getCartItems(cartA.id);
			const itemsB = await controller.getCartItems(cartB.id);

			expect(itemsA).toHaveLength(1);
			expect(itemsB).toHaveLength(0);
		});

		it("removing an item from one cart does not affect another cart", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			const itemA = await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 1000,
				quantity: 1,
			});
			await controller.addItem({
				cartId: cartB.id,
				productId: "prod_2",
				productName: "Gadget",
				productSlug: "gadget",
				price: 2000,
				quantity: 1,
			});

			await controller.removeItem(itemA.id);

			const remainingB = await controller.getCartItems(cartB.id);
			expect(remainingB).toHaveLength(1);
			expect(remainingB[0].productId).toBe("prod_2");
		});

		it("updating item quantity in one cart does not affect items in another cart", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			const itemA = await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 500,
				quantity: 1,
			});
			await controller.addItem({
				cartId: cartB.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 500,
				quantity: 1,
			});

			await controller.updateItem(itemA.id, 10);

			const fetchedB = (await controller.getCartItems(cartB.id))[0];
			expect(fetchedB.quantity).toBe(1);
		});
	});

	// ── Cart Totals ────────────────────────────────────────────────

	describe("cart total isolation", () => {
		it("total reflects only items in that specific cart", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Cheap",
				productSlug: "cheap",
				price: 100,
				quantity: 1,
			});
			await controller.addItem({
				cartId: cartB.id,
				productId: "prod_2",
				productName: "Expensive",
				productSlug: "expensive",
				price: 10000,
				quantity: 2,
			});

			const totalA = await controller.getCartTotal(cartA.id);
			const totalB = await controller.getCartTotal(cartB.id);

			expect(totalA).toBe(100);
			expect(totalB).toBe(20000);
		});

		it("empty cart total is zero regardless of other carts", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 5000,
				quantity: 3,
			});

			const totalB = await controller.getCartTotal(cartB.id);
			expect(totalB).toBe(0);
		});
	});

	// ── Clear Cart Safety ──────────────────────────────────────────

	describe("clear cart safety", () => {
		it("clearing one cart does not remove items from other carts", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 1000,
				quantity: 1,
			});
			await controller.addItem({
				cartId: cartB.id,
				productId: "prod_2",
				productName: "Gadget",
				productSlug: "gadget",
				price: 2000,
				quantity: 1,
			});

			await controller.clearCart(cartA.id);

			const itemsA = await controller.getCartItems(cartA.id);
			const itemsB = await controller.getCartItems(cartB.id);

			expect(itemsA).toHaveLength(0);
			expect(itemsB).toHaveLength(1);
		});

		it("clearing a cart zeroes its total without affecting other totals", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.addItem({
				cartId: cartA.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 800,
				quantity: 2,
			});
			await controller.addItem({
				cartId: cartB.id,
				productId: "prod_2",
				productName: "Gadget",
				productSlug: "gadget",
				price: 1200,
				quantity: 1,
			});

			await controller.clearCart(cartA.id);

			expect(await controller.getCartTotal(cartA.id)).toBe(0);
			expect(await controller.getCartTotal(cartB.id)).toBe(1200);
		});
	});

	// ── Abandoned Cart & Recovery Stats ────────────────────────────

	describe("abandoned cart stats isolation", () => {
		it("markAsAbandoned only changes the targeted cart status", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.markAsAbandoned(cartA.id);

			const refetchedA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const refetchedB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			expect(refetchedA.status).toBe("abandoned");
			expect(refetchedB.status).toBe("active");
		});

		it("recovery email tracking is scoped to the targeted cart", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			await controller.markAsAbandoned(cartA.id);
			await controller.markAsAbandoned(cartB.id);
			await controller.markRecoveryEmailSent(cartA.id);

			const refetchedA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const refetchedB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});

			const metaA = refetchedA.metadata as Record<string, unknown>;
			const metaB = refetchedB.metadata as Record<string, unknown>;

			expect(metaA.recoveryEmailCount).toBe(1);
			expect(metaB.recoveryEmailCount).toBeUndefined();
		});

		it("getRecoveryStats counts only abandoned and recovered carts", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A",
			});
			const cartB = await controller.getOrCreateCart({
				customerId: "cust_B",
			});
			await controller.getOrCreateCart({
				customerId: "cust_C",
			});

			// cartA: abandoned with recovery email sent
			await controller.markAsAbandoned(cartA.id);
			await controller.markRecoveryEmailSent(cartA.id);

			// cartB: abandoned, no email
			await controller.markAsAbandoned(cartB.id);

			// cartC: stays active (not counted as abandoned)

			const stats = await controller.getRecoveryStats();

			expect(stats.totalAbandoned).toBe(2);
			expect(stats.recoverySent).toBe(1);
			expect(stats.recovered).toBe(0);
		});
	});

	// ── Product Active Cart Check ──────────────────────────────────

	describe("isProductInActiveCart scoping", () => {
		it("returns false for a product only in an abandoned cart", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await controller.addItem({
				cartId: cart.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 1000,
				quantity: 1,
			});

			expect(await controller.isProductInActiveCart("prod_1")).toBe(true);

			await controller.markAsAbandoned(cart.id);

			expect(await controller.isProductInActiveCart("prod_1")).toBe(false);
		});

		it("returns true only for the specific product, not all products", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await controller.addItem({
				cartId: cart.id,
				productId: "prod_1",
				productName: "Widget",
				productSlug: "widget",
				price: 1000,
				quantity: 1,
			});

			expect(await controller.isProductInActiveCart("prod_1")).toBe(true);
			expect(await controller.isProductInActiveCart("prod_2")).toBe(false);
		});
	});
});
