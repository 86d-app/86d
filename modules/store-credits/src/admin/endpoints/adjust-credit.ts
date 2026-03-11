import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { StoreCreditController } from "../../service";

export const adjustCredit = createAdminEndpoint(
	"/admin/store-credits/accounts/:customerId/adjust",
	{
		method: "POST",
		params: z.object({
			customerId: z.string(),
		}),
		body: z.object({
			amount: z.number(),
			description: z.string().max(1000).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"store-credits"
		] as StoreCreditController;
		const { customerId } = ctx.params;
		const { amount, description } = ctx.body;

		if (amount === 0) {
			return { error: "Adjustment amount cannot be zero", status: 400 };
		}

		const transaction =
			amount > 0
				? await controller.credit({
						customerId,
						amount,
						reason: "admin_adjustment",
						description,
					})
				: await controller.debit({
						customerId,
						amount: Math.abs(amount),
						reason: "admin_adjustment",
						description,
					});

		const account = await controller.getAccount(customerId);
		return { transaction, account };
	},
);
