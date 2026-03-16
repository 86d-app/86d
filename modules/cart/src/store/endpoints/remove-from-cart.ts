import { createStoreEndpoint, z } from "@86d-app/core";
import type { Cart, CartController, CartItem } from "../../service";

export const removeFromCart = createStoreEndpoint(
	"/cart/items/:id/remove",
	{
		method: "DELETE",
		params: z.object({
			id: z.string().max(200),
		}),
	},
	async (ctx) => {
		const { params } = ctx;
		const context = ctx.context;
		const cartController = context.controllers.cart as CartController;

		// Get the item first to find the cartId
		let existingItem = (await context.data.get(
			"cartItem",
			params.id,
		)) as CartItem | null;

		// Fallback: find item in current user's cart (handles guest-to-customer migration)
		if (!existingItem) {
			const customerId = context.session?.user.id;
			const cart = await cartController.getOrCreateCart(
				customerId ? { customerId } : {},
			);
			const items = await cartController.getCartItems(cart.id);
			existingItem =
				items.find((i) => i.id === params.id) ??
				items.find(
					(i) =>
						`${i.cartId}_${i.productId}` === params.id ||
						(i.variantId &&
							`${i.cartId}_${i.productId}_${i.variantId}` === params.id),
				) ??
				null;
		}

		if (!existingItem) {
			throw ctx.error(404, { message: "Cart item not found" });
		}

		await cartController.removeItem(existingItem.id);

		const items = await cartController.getCartItems(existingItem.cartId);
		const cart = (await context.data.get("cart", existingItem.cartId)) as Cart;

		return {
			cart,
			items,
			itemCount: items.length,
			subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
		};
	},
);
