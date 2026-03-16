import { createAdminEndpoint, z } from "@86d-app/core";
import type { InstagramShopController } from "../../service";

export const deleteListingEndpoint = createAdminEndpoint(
	"/admin/instagram-shop/listings/:id",
	{
		method: "DELETE",
		params: z.object({
			id: z.string().min(1).max(200),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.instagramShop as InstagramShopController;
		const deleted = await controller.deleteListing(ctx.params.id);
		return { deleted };
	},
);
