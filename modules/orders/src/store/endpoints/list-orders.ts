import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const listMyOrders = createStoreEndpoint(
	"/orders/me",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().positive().optional().default(1),
			limit: z.coerce.number().int().positive().max(50).optional().default(10),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const { page, limit } = ctx.query;
		const offset = (page - 1) * limit;

		const controller = ctx.context.controllers.order as OrderController;
		const { orders, total } = await controller.listForCustomer(userId, {
			limit,
			offset,
		});

		return {
			orders,
			total,
			page,
			limit,
			pages: Math.ceil(total / limit),
		};
	},
);
