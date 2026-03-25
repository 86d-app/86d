import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const rejectAffiliateEndpoint = createAdminEndpoint(
	"/admin/affiliates/:id/reject",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const affiliate = await controller.rejectAffiliate(ctx.params.id);
		if (!affiliate) return { error: "Unable to reject affiliate" };
		return { affiliate };
	},
);
