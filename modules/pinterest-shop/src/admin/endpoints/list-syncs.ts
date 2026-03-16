import { createAdminEndpoint, z } from "@86d-app/core";
import type { PinterestShopController } from "../../service";

export const listSyncsEndpoint = createAdminEndpoint(
	"/admin/pinterest-shop/syncs",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.pinterestShop as PinterestShopController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const syncs = await controller.listSyncs({
			take: limit,
			skip,
		});
		return { syncs, total: syncs.length };
	},
);
