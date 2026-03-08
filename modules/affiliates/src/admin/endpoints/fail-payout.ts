import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const failPayoutEndpoint = createAdminEndpoint(
	"/admin/affiliates/payouts/:id/fail",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const payout = await controller.failPayout(ctx.body.id);
		if (!payout) return { error: "Unable to fail payout" };
		return { payout };
	},
);
