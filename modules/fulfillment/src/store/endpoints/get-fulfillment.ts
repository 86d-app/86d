import { createStoreEndpoint, z } from "@86d-app/core";
import type { FulfillmentController } from "../../service";

export const getFulfillment = createStoreEndpoint(
	"/fulfillment/:id",
	{
		method: "GET",
		params: z.object({ id: z.string().min(1) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.fulfillment as FulfillmentController;
		const fulfillment = await controller.getFulfillment(ctx.params.id);
		if (!fulfillment) {
			throw new Error("Fulfillment not found");
		}
		return {
			fulfillment: {
				id: fulfillment.id,
				orderId: fulfillment.orderId,
				status: fulfillment.status,
				items: fulfillment.items,
				carrier: fulfillment.carrier,
				trackingNumber: fulfillment.trackingNumber,
				trackingUrl: fulfillment.trackingUrl,
				shippedAt: fulfillment.shippedAt,
				deliveredAt: fulfillment.deliveredAt,
				createdAt: fulfillment.createdAt,
			},
		};
	},
);
