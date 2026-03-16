import { createStoreEndpoint, z } from "@86d-app/core";
import type { UberDirectController } from "../../service";

export const getDelivery = createStoreEndpoint(
	"/uber-direct/deliveries/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.uberDirect as UberDirectController;
		const delivery = await controller.getDelivery(ctx.params.id);

		if (!delivery) {
			return { error: "Delivery not found", status: 404 };
		}

		return {
			id: delivery.id,
			orderId: delivery.orderId,
			status: delivery.status,
			trackingUrl: delivery.trackingUrl,
			courierName: delivery.courierName,
			estimatedDeliveryTime: delivery.estimatedDeliveryTime,
			fee: delivery.fee,
			tip: delivery.tip,
		};
	},
);
