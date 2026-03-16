import { createStoreEndpoint, z } from "@86d-app/core";
import type { FavorController } from "../../service";

export const getDelivery = createStoreEndpoint(
	"/favor/deliveries/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.favor as FavorController;
		const delivery = await controller.getDelivery(ctx.params.id);

		if (!delivery) {
			return { error: "Delivery not found", status: 404 };
		}

		return {
			id: delivery.id,
			orderId: delivery.orderId,
			status: delivery.status,
			trackingUrl: delivery.trackingUrl,
			runnerName: delivery.runnerName,
			estimatedArrival: delivery.estimatedArrival,
			fee: delivery.fee,
			tip: delivery.tip,
		};
	},
);
