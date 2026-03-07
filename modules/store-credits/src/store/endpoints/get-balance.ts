import { createStoreEndpoint, z } from "@86d-app/core";
import type { StoreCreditController } from "../../service";

export const getBalance = createStoreEndpoint(
	"/store-credits/balance",
	{
		method: "GET",
		query: z.object({
			customerId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"store-credits"
		] as StoreCreditController;
		const account = await controller.getOrCreateAccount(ctx.query.customerId);
		return {
			balance: account.balance,
			currency: account.currency,
			status: account.status,
		};
	},
);
