import { createAdminEndpoint, z } from "@86d-app/core";
import type { FacebookShopController } from "../../service";

export const listOrdersEndpoint = createAdminEndpoint(
	"/admin/facebook-shop/orders",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum([
					"pending",
					"confirmed",
					"shipped",
					"delivered",
					"cancelled",
					"refunded",
				])
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.facebookShop as FacebookShopController;
		const limit = ctx.query.limit ?? 20;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const orders = await controller.listOrders({
			status: ctx.query.status,
			take: limit,
			skip,
		});
		return { orders, total: orders.length };
	},
);
