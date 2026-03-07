import { createStoreEndpoint, z } from "@86d-app/core";
import type { StoreCreditController } from "../../service";

export const applyCredit = createStoreEndpoint(
	"/store-credits/apply",
	{
		method: "POST",
		body: z.object({
			customerId: z.string(),
			amount: z.number().positive(),
			orderId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"store-credits"
		] as StoreCreditController;
		const transaction = await controller.debit({
			customerId: ctx.body.customerId,
			amount: ctx.body.amount,
			reason: "order_payment",
			description: ctx.body.orderId
				? `Applied to order ${ctx.body.orderId}`
				: "Applied store credit to order",
			referenceType: ctx.body.orderId ? "order" : undefined,
			referenceId: ctx.body.orderId,
		});
		return { transaction, remainingBalance: transaction.balanceAfter };
	},
);
