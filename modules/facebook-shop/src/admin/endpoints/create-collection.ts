import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { FacebookShopController } from "../../service";

export const createCollectionEndpoint = createAdminEndpoint(
	"/admin/facebook-shop/collections/create",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText),
			productIds: z.array(z.string().max(200)).max(500),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.facebookShop as FacebookShopController;
		const collection = await controller.createCollection(
			ctx.body.name,
			ctx.body.productIds,
		);
		return { collection };
	},
);
