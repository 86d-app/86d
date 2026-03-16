import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { UberDirectController } from "../../service";

export const createDelivery = createStoreEndpoint(
	"/uber-direct/deliveries",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1).max(200),
			quoteId: z.string().min(1).max(200),
			pickupNotes: z.string().max(500).transform(sanitizeText).optional(),
			dropoffNotes: z.string().max(500).transform(sanitizeText).optional(),
			tip: z.number().min(0).max(100000).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.uberDirect as UberDirectController;
		const delivery = await controller.createDelivery({
			orderId: ctx.body.orderId,
			quoteId: ctx.body.quoteId,
			pickupNotes: ctx.body.pickupNotes,
			dropoffNotes: ctx.body.dropoffNotes,
			tip: ctx.body.tip,
		});

		if (!delivery) {
			return { error: "Quote not found or expired", status: 404 };
		}

		return { delivery };
	},
);
