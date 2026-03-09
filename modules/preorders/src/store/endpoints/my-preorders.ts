import { createStoreEndpoint, z } from "@86d-app/core";
import type { PreordersController } from "../../service";

export const myPreorders = createStoreEndpoint(
	"/preorders/mine",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.preorders as PreordersController;
		const items = await controller.getCustomerPreorders(ctx.query.customerId, {
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { items, total: items.length };
	},
);
