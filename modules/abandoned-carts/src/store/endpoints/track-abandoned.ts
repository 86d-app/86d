import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { AbandonedCartController, CartItemSnapshot } from "../../service";

const cartItemSchema = z.object({
	productId: z.string().min(1),
	variantId: z.string().optional(),
	name: z.string().min(1).max(200).transform(sanitizeText),
	sku: z.string().max(100).optional(),
	price: z.number().min(0),
	quantity: z.number().int().min(1),
	imageUrl: z.string().max(2000).optional(),
});

export const trackAbandoned = createStoreEndpoint(
	"/abandoned-carts/track",
	{
		method: "POST",
		body: z.object({
			cartId: z.string().min(1).max(200),
			customerId: z.string().optional(),
			email: z.string().email().max(320).optional(),
			items: z.array(cartItemSchema).min(1).max(100),
			cartTotal: z.number().min(0),
			currency: z.string().length(3).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.abandonedCarts as AbandonedCartController;

		// Check if this cart is already tracked
		const existing = await controller.getByCartId(ctx.body.cartId);
		if (existing && existing.status === "active") {
			// Already tracked and active — no-op
			return { tracked: true, id: existing.id };
		}

		const cart = await controller.create({
			cartId: ctx.body.cartId,
			customerId: ctx.body.customerId,
			email: ctx.body.email,
			items: ctx.body.items as CartItemSnapshot[],
			cartTotal: ctx.body.cartTotal,
			currency: ctx.body.currency,
		});

		return { tracked: true, id: cart.id };
	},
);
