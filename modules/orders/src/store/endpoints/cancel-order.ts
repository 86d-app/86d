import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const cancelMyOrder = createStoreEndpoint(
	"/orders/me/:id/cancel",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
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

		return {
			code: "ORDER_CANCELLATION_OPERATION_UNAVAILABLE",
			error:
				"Order cancellation is unavailable until Payment, Inventory, tax, loyalty, and Shipping effects are coordinated durably.",
			status: 503,
		};
	},
);
