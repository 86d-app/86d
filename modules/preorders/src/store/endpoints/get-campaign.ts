import { createStoreEndpoint, z } from "@86d-app/core";
import type { PreordersController } from "../../service";

export const getCampaign = createStoreEndpoint(
	"/preorders/campaigns/:id",
	{
		method: "GET",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.preorders as PreordersController;
		const campaign = await controller.getCampaign(ctx.params.id);
		if (!campaign || campaign.status !== "active") {
			return { campaign: null };
		}
		return { campaign };
	},
);
