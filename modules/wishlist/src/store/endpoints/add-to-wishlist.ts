import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { WishlistController } from "../../service";

export const addToWishlist = createStoreEndpoint(
	"/wishlist/add",
	{
		method: "POST",
		body: z.object({
			customerId: z.string(),
			productId: z.string(),
			productName: z.string().max(500).transform(sanitizeText),
			productImage: z.string().max(2000).optional(),
			note: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.wishlist as WishlistController;
		const item = await controller.addItem({
			customerId: ctx.body.customerId,
			productId: ctx.body.productId,
			productName: ctx.body.productName,
			productImage: ctx.body.productImage,
			note: ctx.body.note,
		});
		return { item };
	},
);
