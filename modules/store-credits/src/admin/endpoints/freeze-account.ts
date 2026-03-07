import { createAdminEndpoint, z } from "@86d-app/core";
import type { StoreCreditController } from "../../service";

export const freezeAccount = createAdminEndpoint(
	"/admin/store-credits/accounts/:customerId/freeze",
	{
		method: "POST",
		params: z.object({
			customerId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"store-credits"
		] as StoreCreditController;
		const account = await controller.freezeAccount(ctx.params.customerId);
		return { account };
	},
);
