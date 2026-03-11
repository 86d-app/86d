import { createStoreEndpoint, z } from "@86d-app/core";
import type { WishlistController } from "../../service";

export const removeFromWishlist = createStoreEndpoint(
	"/wishlist/remove/:id",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) {
			return { error: "Unauthorized", status: 401 };
		}
		const controller = ctx.context.controllers.wishlist as WishlistController;
		const item = await controller.getItem(ctx.params.id);
		if (!item || item.customerId !== customerId) {
			return { error: "Wishlist item not found", status: 404 };
		}
		const removed = await controller.removeItem(ctx.params.id);
		if (!removed) return { error: "Wishlist item not found", status: 404 };
		return { removed };
	},
);
