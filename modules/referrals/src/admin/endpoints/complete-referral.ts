import { createAdminEndpoint, z } from "@86d-app/core";
import type { ReferralController } from "../../service";

export const completeReferralEndpoint = createAdminEndpoint(
	"/admin/referrals/:id/complete",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.referrals as ReferralController;
		const referral = await controller.completeReferral(ctx.params.id);
		if (!referral) return { error: "Cannot complete referral" };
		return { referral };
	},
);
