import { createStoreEndpoint, z } from "@86d-app/core";
import type { StoreCreditController } from "../../service";

export const applyCredit = createStoreEndpoint(
	"/store-credits/apply",
	{
		method: "POST",
		body: z.object({
			amount: z.number().positive(),
			orderId: z.string().max(200).optional(),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}
		const customerId = session.user.id;

		const controller = ctx.context.controllers[
			"store-credits"
		] as StoreCreditController;
		const transaction = await controller.debit({
			customerId,
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
