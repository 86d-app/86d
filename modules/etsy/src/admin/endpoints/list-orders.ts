import { createAdminEndpoint, z } from "@86d-app/core";
import type { EtsyController, EtsyOrderStatus } from "../../service";

export const listOrdersEndpoint = createAdminEndpoint(
	"/admin/etsy/orders",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum(["open", "paid", "shipped", "completed", "cancelled"])
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.etsy as EtsyController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const orders = await controller.listOrders({
			status: ctx.query.status as EtsyOrderStatus | undefined,
			take: limit,
			skip,
		});
		return { orders, total: orders.length };
	},
);
