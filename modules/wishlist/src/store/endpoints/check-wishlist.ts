import { createStoreEndpoint, z } from "@86d-app/core";
import type { WishlistController } from "../../service";

export const checkWishlist = createStoreEndpoint(
	"/wishlist/check/:productId",
	{
		method: "GET",
		params: z.object({ productId: z.string() }),
		query: z.object({
			customerId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.wishlist as WishlistController;
		const inWishlist = await controller.isInWishlist(
			ctx.query.customerId,
			ctx.params.productId,
		);
		return { inWishlist };
	},
);
