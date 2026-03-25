import { createAdminEndpoint, z } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

export const getFeedItems = createAdminEndpoint(
	"/admin/product-feeds/:id/items",
	{
		method: "GET",
		params: z.object({ id: z.string().max(200) }),
		query: z.object({
			status: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;

		const items = await controller.getFeedItems(ctx.params.id, {
			status: ctx.query.status as
				| "valid"
				| "warning"
				| "error"
				| "excluded"
				| undefined,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});

		return { items, total: items.length };
	},
);
