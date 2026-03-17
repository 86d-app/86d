import { createStoreEndpoint, z } from "@86d-app/core";
import type { ShippingController } from "../../service";

export const purchaseLabelEndpoint = createStoreEndpoint(
	"/shipping/purchase-label",
	{
		method: "POST",
		body: z.object({
			shipmentId: z.string().min(1),
			easypostShipmentId: z.string().min(1),
			easypostRateId: z.string().min(1),
			insurance: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.shipping as ShippingController;
		const shipment = await controller.purchaseLabel({
			shipmentId: ctx.body.shipmentId,
			easypostShipmentId: ctx.body.easypostShipmentId,
			easypostRateId: ctx.body.easypostRateId,
			insurance: ctx.body.insurance,
		});
		return { shipment };
	},
);
