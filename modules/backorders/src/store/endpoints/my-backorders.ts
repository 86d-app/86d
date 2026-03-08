import { createStoreEndpoint, z } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const myBackorders = createStoreEndpoint(
	"/backorders/mine",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const backorders = await controller.getCustomerBackorders(
			ctx.query.customerId,
			{
				take: ctx.query.take ?? 50,
				skip: ctx.query.skip ?? 0,
			},
		);
		return { backorders };
	},
);
