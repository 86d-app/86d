import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { UberEatsController } from "../../service";

export const receiveOrderEndpoint = createStoreEndpoint(
	"/uber-eats/orders",
	{
		method: "POST",
		body: z.object({
			externalOrderId: z.string().max(200).transform(sanitizeText),
			items: z.array(z.record(z.string().max(100), z.unknown())).max(100),
			subtotal: z.number().min(0),
			deliveryFee: z.number().min(0),
			tax: z.number().min(0),
			total: z.number().min(0),
			customerName: z.string().max(200).transform(sanitizeText).optional(),
			customerPhone: z.string().max(50).transform(sanitizeText).optional(),
			specialInstructions: z
				.string()
				.max(1000)
				.transform(sanitizeText)
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const order = await controller.receiveOrder({
			externalOrderId: ctx.body.externalOrderId,
			items: ctx.body.items,
			subtotal: ctx.body.subtotal,
			deliveryFee: ctx.body.deliveryFee,
			tax: ctx.body.tax,
			total: ctx.body.total,
			customerName: ctx.body.customerName,
			customerPhone: ctx.body.customerPhone,
			specialInstructions: ctx.body.specialInstructions,
		});
		return { order };
	},
);
