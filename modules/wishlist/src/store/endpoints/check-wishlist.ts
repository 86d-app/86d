import { createStoreEndpoint, z } from "@86d-app/core";
import type { WishlistController } from "../../service";

export const checkWishlist = createStoreEndpoint(
	"/wishlist/check/:productId",
	{
		method: "GET",
		params: z.object({ productId: z.string() }),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) {
			return { inWishlist: false };
		}
		const controller = ctx.context.controllers.wishlist as WishlistController;
		const inWishlist = await controller.isInWishlist(
			customerId,
			ctx.params.productId,
		);
		return { inWishlist };
	},
);
