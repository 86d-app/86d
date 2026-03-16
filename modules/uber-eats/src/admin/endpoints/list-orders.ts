import { createAdminEndpoint, z } from "@86d-app/core";
import type { UberEatsController, UberOrderStatus } from "../../service";

export const listOrdersEndpoint = createAdminEndpoint(
	"/admin/uber-eats/orders",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum([
					"pending",
					"accepted",
					"preparing",
					"ready",
					"picked-up",
					"delivered",
					"cancelled",
				])
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const orders = await controller.listOrders({
			status: ctx.query.status as UberOrderStatus | undefined,
			take: limit,
			skip,
		});
		return { orders, total: orders.length };
	},
);
