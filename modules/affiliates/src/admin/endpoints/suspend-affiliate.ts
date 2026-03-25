import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const suspendAffiliateEndpoint = createAdminEndpoint(
	"/admin/affiliates/:id/suspend",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const affiliate = await controller.suspendAffiliate(ctx.params.id);
		if (!affiliate) return { error: "Unable to suspend affiliate" };
		return { affiliate };
	},
);
