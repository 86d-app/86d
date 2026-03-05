import { createStoreEndpoint, z } from "@86d-app/core";
import type { PaymentController } from "../../service";

export const deletePaymentMethod = createStoreEndpoint(
	"/payments/methods/:id",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as PaymentController;
		const method = await controller.getPaymentMethod(ctx.params.id);
		if (!method) return { error: "Payment method not found", status: 404 };
		const deleted = await controller.deletePaymentMethod(ctx.params.id);
		return { deleted };
	},
);
