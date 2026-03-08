import { createStoreEndpoint } from "@86d-app/core";
import type { MultiCurrencyController } from "../../service";

export const listCurrencies = createStoreEndpoint(
	"/currencies",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.multiCurrency as MultiCurrencyController;
		const currencies = await controller.list({ activeOnly: true });
		return { currencies };
	},
);
