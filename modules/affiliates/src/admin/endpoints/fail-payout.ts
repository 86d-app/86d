import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const failPayoutEndpoint = createAdminEndpoint(
	"/admin/affiliates/payouts/:id/fail",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const payout = await controller.failPayout(ctx.params.id);
		if (!payout) return { error: "Unable to fail payout" };
		return { payout };
	},
);
