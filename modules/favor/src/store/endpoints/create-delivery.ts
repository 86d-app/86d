import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { FavorController } from "../../service";

export const createDelivery = createStoreEndpoint(
	"/favor/deliveries",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1).max(200),
			pickupAddress: z.record(z.string().max(100), z.unknown()),
			dropoffAddress: z.record(z.string().max(100), z.unknown()),
			fee: z.number().min(0).max(100000),
			tip: z.number().min(0).max(100000).optional(),
			specialInstructions: z
				.string()
				.max(500)
				.transform(sanitizeText)
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.favor as FavorController;
		const delivery = await controller.createDelivery({
			orderId: ctx.body.orderId,
			pickupAddress: ctx.body.pickupAddress,
			dropoffAddress: ctx.body.dropoffAddress,
			fee: ctx.body.fee,
			tip: ctx.body.tip,
			specialInstructions: ctx.body.specialInstructions,
		});
		return { delivery };
	},
);
