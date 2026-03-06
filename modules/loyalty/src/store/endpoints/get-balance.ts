import { createStoreEndpoint, z } from "@86d-app/core";
import type { LoyaltyController } from "../../service";

export const getBalance = createStoreEndpoint(
	"/loyalty/balance",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.loyalty as LoyaltyController;
		const account = await controller.getOrCreateAccount(ctx.query.customerId);
		return {
			balance: account.balance,
			tier: account.tier,
			lifetimeEarned: account.lifetimeEarned,
			lifetimeRedeemed: account.lifetimeRedeemed,
			status: account.status,
		};
	},
);
