import { createAdminEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const adminListFulfillments = createAdminEndpoint(
	"/admin/orders/:id/fulfillments",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		const order = await controller.getById(ctx.params.id);
		if (!order) {
			return { error: "Order not found", status: 404 };
		}

		const fulfillments = await controller.listFulfillments(ctx.params.id);
		const fulfillmentStatus = await controller.getOrderFulfillmentStatus(
			ctx.params.id,
		);

		return { fulfillments, fulfillmentStatus };
	},
);
