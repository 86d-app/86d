import { createStoreEndpoint, z } from "@86d-app/core";
import type { PaymentController } from "../../service";

export const listPaymentMethods = createStoreEndpoint(
	"/payments/methods",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.payments as PaymentController;
		const methods = await controller.listPaymentMethods(ctx.query.customerId);
		return { methods };
	},
);
