import { createAdminEndpoint, z } from "@86d-app/core";
import type { PinterestShopController } from "../../service";

export const deleteCatalogItemEndpoint = createAdminEndpoint(
	"/admin/pinterest-shop/items/:id",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.pinterestShop as PinterestShopController;
		const deleted = await controller.deleteCatalogItem(ctx.params.id);
		return { deleted };
	},
);
