import { createStoreEndpoint, z } from "@86d-app/core";
import type { ShippingController } from "../../service";

export const trackShipment = createStoreEndpoint(
	"/shipping/track/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.shipping as ShippingController;
		const shipment = await controller.getShipment(ctx.params.id);
		if (!shipment) {
			return { error: "Shipment not found", status: 404 };
		}

		const trackingUrl = await controller.getTrackingUrl(shipment.id);

		return {
			shipment: {
				id: shipment.id,
				orderId: shipment.orderId,
				trackingNumber: shipment.trackingNumber,
				status: shipment.status,
				shippedAt: shipment.shippedAt,
				deliveredAt: shipment.deliveredAt,
				estimatedDelivery: shipment.estimatedDelivery,
			},
			trackingUrl,
		};
	},
);
