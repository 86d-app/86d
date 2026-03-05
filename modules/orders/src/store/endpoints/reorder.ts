import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const reorder = createStoreEndpoint(
	"/orders/me/:id/reorder",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.order as OrderController;
		const order = await controller.getById(ctx.params.id);

		if (!order || order.customerId !== userId) {
			return { error: "Order not found", status: 404 };
		}

		const items = await controller.getReorderItems(ctx.params.id);
		if (!items || items.length === 0) {
			return { error: "No items to reorder", status: 422 };
		}

		return { items };
	},
);
