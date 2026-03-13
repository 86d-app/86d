import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { ShippingController } from "../../service";

export const createShipment = createAdminEndpoint(
	"/admin/shipping/shipments/create",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1).max(200),
			carrierId: z.string().optional(),
			methodId: z.string().optional(),
			trackingNumber: z.string().max(200).transform(sanitizeText).optional(),
			estimatedDelivery: z.coerce.date().optional(),
			notes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.shipping as ShippingController;
		const shipment = await controller.createShipment({
			orderId: ctx.body.orderId,
			carrierId: ctx.body.carrierId,
			methodId: ctx.body.methodId,
			trackingNumber: ctx.body.trackingNumber,
			estimatedDelivery: ctx.body.estimatedDelivery,
			notes: ctx.body.notes,
		});
		return { shipment };
	},
);
