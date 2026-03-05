import { createStoreEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const trackOrder = createStoreEndpoint(
	"/orders/track",
	{
		method: "POST",
		body: z.object({
			orderNumber: z
				.string()
				.min(1, "Order number is required")
				.transform((v) => v.trim()),
			email: z
				.string()
				.email("Valid email is required")
				.transform((v) => v.toLowerCase().trim()),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;
		const { orderNumber, email } = ctx.body;

		const order = await controller.getByTracking(orderNumber, email);

		if (!order) {
			return { error: "Order not found", status: 404 };
		}

		// Fetch fulfillments for tracking info
		const fulfillments = await controller.listFulfillments(order.id);

		return { order, fulfillments };
	},
);
