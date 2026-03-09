import { createAdminEndpoint, z } from "@86d-app/core";
import type { PreordersController } from "../../service";

export const activateCampaign = createAdminEndpoint(
	"/admin/preorders/campaigns/:id/activate",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.preorders as PreordersController;
		const campaign = await controller.activateCampaign(ctx.params.id);
		if (!campaign) {
			return { error: "Cannot activate campaign", campaign: null };
		}
		return { campaign };
	},
);
