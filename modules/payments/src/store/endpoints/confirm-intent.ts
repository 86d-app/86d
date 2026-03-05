import { createStoreEndpoint, z } from "@86d-app/core";
import type { PaymentController } from "../../service";

export const confirmIntent = createStoreEndpoint(
	"/payments/intents/:id/confirm",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as PaymentController;
		const intent = await controller.confirmIntent(ctx.params.id);
		if (!intent) return { error: "Payment intent not found", status: 404 };
		return { intent };
	},
);
