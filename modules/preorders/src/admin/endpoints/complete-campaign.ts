import { createAdminEndpoint, z } from "@86d-app/core";
import type { PreordersController } from "../../service";

export const completeCampaign = createAdminEndpoint(
	"/admin/preorders/campaigns/:id/complete",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.preorders as PreordersController;
		const campaign = await controller.completeCampaign(ctx.params.id);
		if (!campaign) {
			return { error: "Cannot complete campaign", campaign: null };
		}
		return { campaign };
	},
);
