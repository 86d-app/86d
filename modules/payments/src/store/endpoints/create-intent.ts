import { createStoreEndpoint, z } from "@86d-app/core";
import type { PaymentController } from "../../service";

export const createIntent = createStoreEndpoint(
	"/payments/intents",
	{
		method: "POST",
		body: z.object({
			amount: z.number().int().positive(),
			currency: z.string().max(3).optional(),
			email: z.string().email().optional(),
			orderId: z.string().optional(),
			checkoutSessionId: z.string().optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as PaymentController;
		const intent = await controller.createIntent({
			amount: ctx.body.amount,
			currency: ctx.body.currency,
			email: ctx.body.email,
			orderId: ctx.body.orderId,
			checkoutSessionId: ctx.body.checkoutSessionId,
			metadata: ctx.body.metadata,
		});
		return { intent };
	},
);
