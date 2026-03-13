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
 * - Item merge/variant behavior
 * - Pagination and boundary safety
 * - Quantity update and removal integrity
 */

describe("cart endpoint security", () => {
	let mockData: ReturnType<typeof createMockDataService>;
	let controller: ReturnType<typeof createCartControllers>;

	beforeEach(() => {
		mockData = createMockDataService();
		controller = createCartControllers(mockData);
	});

	function addWidget(
		cartId: string,
		overrides: Partial<Parameters<typeof controller.addItem>[0]> = {},
	) {
		return controller.addItem({
			cartId,
			productId: "prod_1",
			productName: "Widget",
			productSlug: "widget",
			price: 1000,
			quantity: 1,
			...overrides,
		});
	}

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

		it("different guests get different carts", async () => {
			const g1 = await controller.getOrCreateCart({ guestId: "g1" });
			const g2 = await controller.getOrCreateCart({ guestId: "g2" });
			expect(g1.id).not.toBe(g2.id);
		});

		it("same guest gets the same cart on repeated calls", async () => {
			const g1 = await controller.getOrCreateCart({ guestId: "g1" });
			const g2 = await controller.getOrCreateCart({ guestId: "g1" });
			expect(g1.id).toBe(g2.id);
		});

		it("new cart starts with active status", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_new",
			});
			expect(cart.status).toBe("active");
		});

		it("new cart has an expiration date in the future", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_exp",
			});
			expect(new Date(cart.expiresAt).getTime()).toBeGreaterThan(Date.now());
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

			await addWidget(cartA.id);

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

			const itemA = await addWidget(cartA.id);
			await addWidget(cartB.id, {
				productId: "prod_2",
				productName: "Gadget",
				productSlug: "gadget",
				price: 2000,
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

			const itemA = await addWidget(cartA.id, { price: 500 });
			await addWidget(cartB.id, { price: 500 });

			await controller.updateItem(itemA.id, 10);

			const fetchedB = (await controller.getCartItems(cartB.id))[0];
			expect(fetchedB.quantity).toBe(1);
		});

		it("removing one item from a cart preserves other items in the same cart", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});
			const item1 = await addWidget(cart.id, {
				productId: "p1",
				productName: "A",
				productSlug: "a",
			});
			await addWidget(cart.id, {
				productId: "p2",
				productName: "B",
				productSlug: "b",
			});
			await addWidget(cart.id, {
				productId: "p3",
				productName: "C",
				productSlug: "c",
			});

			await controller.removeItem(item1.id);

			const remaining = await controller.getCartItems(cart.id);
			expect(remaining).toHaveLength(2);
			expect(remaining.map((i) => i.productId).sort()).toEqual(["p2", "p3"]);
		});
	});

	// ── Item Merge Behavior ───────────────────────────────────────

	describe("item merge and variant handling", () => {
		it("adding same product twice merges quantity", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await addWidget(cart.id, { quantity: 2 });
			await addWidget(cart.id, { quantity: 3 });

			const items = await controller.getCartItems(cart.id);
			expect(items).toHaveLength(1);
			expect(items[0].quantity).toBe(5);
		});

		it("same product with different variants creates separate items", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await addWidget(cart.id, { variantId: "var_blue" });
			await addWidget(cart.id, { variantId: "var_red" });

			const items = await controller.getCartItems(cart.id);
			expect(items).toHaveLength(2);
		});

		it("same product and variant merges quantity", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await addWidget(cart.id, { variantId: "var_blue", quantity: 1 });
			await addWidget(cart.id, { variantId: "var_blue", quantity: 2 });

			const items = await controller.getCartItems(cart.id);
			expect(items).toHaveLength(1);
			expect(items[0].quantity).toBe(3);
		});

		it("item ID is deterministic based on cart, product, and variant", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_det",
			});

			const item = await addWidget(cart.id, {
				productId: "prod_x",
				variantId: "var_y",
			});
			expect(item.id).toBe(`${cart.id}_prod_x_var_y`);
		});

		it("item without variant has ID based on cart and product only", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_det2",
			});

			const item = await addWidget(cart.id, { productId: "prod_z" });
			expect(item.id).toBe(`${cart.id}_prod_z`);
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

			await addWidget(cartA.id, { price: 100 });
			await addWidget(cartB.id, {
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

			await addWidget(cartA.id, { price: 5000, quantity: 3 });

			const totalB = await controller.getCartTotal(cartB.id);
			expect(totalB).toBe(0);
		});

		it("total updates correctly after quantity change", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_total",
			});
			const item = await addWidget(cart.id, { price: 500, quantity: 2 });

			expect(await controller.getCartTotal(cart.id)).toBe(1000);

			await controller.updateItem(item.id, 5);

			expect(await controller.getCartTotal(cart.id)).toBe(2500);
		});

		it("total updates after item removal", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_rem",
			});
			const item1 = await addWidget(cart.id, {
				productId: "p1",
				productName: "A",
				productSlug: "a",
				price: 300,
			});
			await addWidget(cart.id, {
				productId: "p2",
				productName: "B",
				productSlug: "b",
				price: 700,
			});

			expect(await controller.getCartTotal(cart.id)).toBe(1000);

			await controller.removeItem(item1.id);

			expect(await controller.getCartTotal(cart.id)).toBe(700);
		});

		it("total with multiple items and quantities", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_multi",
			});
			await addWidget(cart.id, {
				productId: "p1",
				productName: "A",
				productSlug: "a",
				price: 100,
				quantity: 3,
			});
			await addWidget(cart.id, {
				productId: "p2",
				productName: "B",
				productSlug: "b",
				price: 250,
				quantity: 2,
			});

			expect(await controller.getCartTotal(cart.id)).toBe(800);
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

			await addWidget(cartA.id);
			await addWidget(cartB.id, {
				productId: "prod_2",
				productName: "Gadget",
				productSlug: "gadget",
				price: 2000,
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

			await addWidget(cartA.id, { price: 800, quantity: 2 });
			await addWidget(cartB.id, {
				productId: "prod_2",
				productName: "Gadget",
				productSlug: "gadget",
				price: 1200,
			});

			await controller.clearCart(cartA.id);

			expect(await controller.getCartTotal(cartA.id)).toBe(0);
			expect(await controller.getCartTotal(cartB.id)).toBe(1200);
		});

		it("clearing an already empty cart is a no-op", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_empty",
			});
			await controller.clearCart(cart.id);
			expect(await controller.getCartItems(cart.id)).toHaveLength(0);
			expect(await controller.getCartTotal(cart.id)).toBe(0);
		});

		it("clearing a cart with many items removes all", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_many",
			});
			for (let i = 0; i < 15; i++) {
				await addWidget(cart.id, {
					productId: `prod_${i}`,
					productName: `Item ${i}`,
					productSlug: `item-${i}`,
				});
			}
			expect(await controller.getCartItems(cart.id)).toHaveLength(15);

			await controller.clearCart(cart.id);
			expect(await controller.getCartItems(cart.id)).toHaveLength(0);
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

			await controller.markAsAbandoned(cartA.id);
			await controller.markRecoveryEmailSent(cartA.id);

			await controller.markAsAbandoned(cartB.id);

			const stats = await controller.getRecoveryStats();

			expect(stats.totalAbandoned).toBe(2);
			expect(stats.recoverySent).toBe(1);
			expect(stats.recovered).toBe(0);
		});

		it("multiple recovery emails increment the count", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_multi_email",
			});
			await controller.markAsAbandoned(cart.id);

			await controller.markRecoveryEmailSent(cart.id);
			await controller.markRecoveryEmailSent(cart.id);
			await controller.markRecoveryEmailSent(cart.id);

			const refetched = await controller.getOrCreateCart({
				customerId: "cust_multi_email",
			});
			const meta = refetched.metadata as Record<string, unknown>;
			expect(meta.recoveryEmailCount).toBe(3);
		});

		it("recovery stats with no carts returns zeros", async () => {
			const stats = await controller.getRecoveryStats();
			expect(stats.totalAbandoned).toBe(0);
			expect(stats.recoverySent).toBe(0);
			expect(stats.recovered).toBe(0);
		});
	});

	// ── Product Active Cart Check ──────────────────────────────────

	describe("isProductInActiveCart scoping", () => {
		it("returns false for a product only in an abandoned cart", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await addWidget(cart.id);

			expect(await controller.isProductInActiveCart("prod_1")).toBe(true);

			await controller.markAsAbandoned(cart.id);

			expect(await controller.isProductInActiveCart("prod_1")).toBe(false);
		});

		it("returns true only for the specific product, not all products", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_1",
			});

			await addWidget(cart.id);

			expect(await controller.isProductInActiveCart("prod_1")).toBe(true);
			expect(await controller.isProductInActiveCart("prod_2")).toBe(false);
		});

		it("returns true if product is in ANY active cart", async () => {
			const cart1 = await controller.getOrCreateCart({
				customerId: "cust_1",
			});
			const cart2 = await controller.getOrCreateCart({
				customerId: "cust_2",
			});

			await addWidget(cart1.id);
			await addWidget(cart2.id);

			// Abandon one cart
			await controller.markAsAbandoned(cart1.id);

			// Still true because cart2 is active
			expect(await controller.isProductInActiveCart("prod_1")).toBe(true);
		});

		it("returns false for a product that was removed from all active carts", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_rem",
			});

			const item = await addWidget(cart.id, { productId: "prod_gone" });
			expect(await controller.isProductInActiveCart("prod_gone")).toBe(true);

			await controller.removeItem(item.id);
			expect(await controller.isProductInActiveCart("prod_gone")).toBe(false);
		});

		it("returns false for a product never added to any cart", async () => {
			expect(await controller.isProductInActiveCart("never_added")).toBe(false);
		});
	});

	// ── Update Item Edge Cases ─────────────────────────────────────

	describe("updateItem safety", () => {
		it("updating non-existent item throws error", async () => {
			await expect(
				controller.updateItem("nonexistent_item", 5),
			).rejects.toThrow();
		});

		it("updating quantity preserves other item fields", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_preserve",
			});
			const item = await addWidget(cart.id, {
				productId: "p_special",
				productName: "Special",
				productSlug: "special",
				price: 999,
				productImage: "img.png",
			});

			const updated = await controller.updateItem(item.id, 7);
			expect(updated.quantity).toBe(7);
			expect(updated.price).toBe(999);
			expect(updated.productName).toBe("Special");
			expect(updated.productSlug).toBe("special");
			expect(updated.productImage).toBe("img.png");
			expect(updated.cartId).toBe(cart.id);
		});
	});

	// ── Cart Metadata Isolation ────────────────────────────────────

	describe("cart metadata isolation", () => {
		it("new cart has empty metadata", async () => {
			const cart = await controller.getOrCreateCart({
				customerId: "cust_meta",
			});
			expect(cart.metadata).toEqual({});
		});

		it("markRecoveryEmailSent adds metadata to correct cart only", async () => {
			const cartA = await controller.getOrCreateCart({
				customerId: "cust_A_meta",
			});
			await controller.getOrCreateCart({
				customerId: "cust_B_meta",
			});

			await controller.markAsAbandoned(cartA.id);
			await controller.markRecoveryEmailSent(cartA.id);

			const refetchedA = await controller.getOrCreateCart({
				customerId: "cust_A_meta",
			});
			const refetchedB = await controller.getOrCreateCart({
				customerId: "cust_B_meta",
			});

			const metaA = refetchedA.metadata as Record<string, unknown>;
			expect(metaA.recoveryEmailSentAt).toBeDefined();
			expect(metaA.recoveryEmailCount).toBe(1);

			const metaB = refetchedB.metadata as Record<string, unknown>;
			expect(metaB.recoveryEmailSentAt).toBeUndefined();
		});
	});
});
