import { createStoreEndpoint, z } from "@86d-app/core";
import type { FulfillmentController } from "../../service";

export const listByOrder = createStoreEndpoint(
	"/fulfillment/order/:orderId",
	{
		method: "GET",
		params: z.object({ orderId: z.string().min(1).max(100) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.fulfillment as FulfillmentController;
		const fulfillments = await controller.listByOrder(ctx.params.orderId);
		return {
			fulfillments: fulfillments.map((f) => ({
				id: f.id,
				orderId: f.orderId,
				status: f.status,
				items: f.items,
				carrier: f.carrier,
				trackingNumber: f.trackingNumber,
				trackingUrl: f.trackingUrl,
				shippedAt: f.shippedAt,
				deliveredAt: f.deliveredAt,
				createdAt: f.createdAt,
			})),
		};
	},
);
