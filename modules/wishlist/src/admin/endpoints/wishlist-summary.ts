import { createAdminEndpoint } from "@86d-app/core";
import type { WishlistController } from "../../service";

export const wishlistSummary = createAdminEndpoint(
	"/admin/wishlist/summary",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers.wishlist as WishlistController;
		const summary = await controller.getSummary();
		return { summary };
	},
);
