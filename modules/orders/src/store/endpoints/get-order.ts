import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const getMyOrder = createStoreEndpoint(
	"/orders/me/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const controller = ctx.context.controllers.order as OrderController;
		const order = await controller.getById(ctx.params.id);

		if (!order) {
			return { error: "Order not found", status: 404 };
		}

		// Ensure the order belongs to the requesting customer
		if (order.customerId !== userId) {
			return { error: "Order not found", status: 404 };
		}

		return { order };
	},
);
