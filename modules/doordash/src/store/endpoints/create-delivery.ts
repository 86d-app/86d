import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { DoordashController } from "../../service";

export const createDeliveryEndpoint = createStoreEndpoint(
	"/doordash/deliveries",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().max(200).transform(sanitizeText),
			pickupAddress: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 20, {
					message: "Too many fields in address",
				}),
			dropoffAddress: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 20, {
					message: "Too many fields in address",
				}),
			fee: z.number().min(0),
			tip: z.number().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.doordash as DoordashController;
		const delivery = await controller.createDelivery({
			orderId: ctx.body.orderId,
			pickupAddress: ctx.body.pickupAddress,
			dropoffAddress: ctx.body.dropoffAddress,
			fee: ctx.body.fee,
			tip: ctx.body.tip,
		});
		return { delivery };
	},
);
