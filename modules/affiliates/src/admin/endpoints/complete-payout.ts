import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const completePayoutEndpoint = createAdminEndpoint(
	"/admin/affiliates/payouts/:id/complete",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const payout = await controller.completePayout(ctx.body.id);
		if (!payout) return { error: "Unable to complete payout" };
		return { payout };
	},
);
