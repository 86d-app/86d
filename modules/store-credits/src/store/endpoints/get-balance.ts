import { createStoreEndpoint, z } from "@86d-app/core";
import type { StoreCreditController } from "../../service";

export const getBalance = createStoreEndpoint(
	"/store-credits/balance",
	{
		method: "GET",
		query: z.object({}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers[
			"store-credits"
		] as StoreCreditController;
		const account = await controller.getOrCreateAccount(session.user.id);
		return {
			balance: account.balance,
			currency: account.currency,
			status: account.status,
		};
	},
);
