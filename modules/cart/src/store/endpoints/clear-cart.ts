import { createStoreEndpoint } from "@86d-app/core";
import type { CartController } from "../../service";

export const clearCart = createStoreEndpoint(
	"/cart/clear",
	{
		method: "POST",
	},
	async (ctx) => {
		const context = ctx.context;
		const cartController = context.controllers.cart as CartController;

		const customerId = context.session?.user.id;
		const cart = await cartController.getOrCreateCart(
			customerId ? { customerId } : {},
		);

		await cartController.clearCart(cart.id);

		return {
			cart,
			items: [],
			itemCount: 0,
			subtotal: 0,
		};
	},
);
