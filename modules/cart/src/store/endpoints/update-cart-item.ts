import { createStoreEndpoint, z } from "@86d-app/core";
import type { Cart, CartController } from "../../service";

export const updateCartItem = createStoreEndpoint(
	"/cart/items/:id/update",
	{
		method: "PATCH",
		params: z.object({
			id: z.string().max(200),
		}),
		body: z.object({
			quantity: z.number().positive().int(),
		}),
	},
	async (ctx) => {
		const { params, body } = ctx;
		const context = ctx.context;
		const cartController = context.controllers.cart as CartController;

		const item = await cartController.updateItem(params.id, body.quantity);

		const items = await cartController.getCartItems(item.cartId);
		const cart = (await context.data.get("cart", item.cartId)) as Cart;

		return {
			cart,
			item,
			items,
			itemCount: items.length,
			subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
		};
	},
);
