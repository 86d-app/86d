import { createStoreEndpoint, z } from "@86d-app/core";
import type { LoyaltyController } from "../../service";

export const listTransactions = createStoreEndpoint(
	"/loyalty/transactions",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
			type: z.enum(["earn", "redeem", "adjust", "expire"]).optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.loyalty as LoyaltyController;
		const account = await controller.getAccount(ctx.query.customerId);
		if (!account) {
			return { transactions: [], total: 0 };
		}
		const transactions = await controller.listTransactions(account.id, {
			type: ctx.query.type,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { transactions, total: transactions.length };
	},
);
