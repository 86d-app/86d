import { createAdminEndpoint, z } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const listBackorders = createAdminEndpoint(
	"/admin/backorders",
	{
		method: "GET",
		query: z.object({
			productId: z.string().optional(),
			customerId: z.string().optional(),
			status: z
				.enum([
					"pending",
					"confirmed",
					"allocated",
					"shipped",
					"delivered",
					"cancelled",
				])
				.optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const backorders = await controller.listBackorders({
			productId: ctx.query.productId,
			customerId: ctx.query.customerId,
			status: ctx.query.status,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { backorders, total: backorders.length };
	},
);
