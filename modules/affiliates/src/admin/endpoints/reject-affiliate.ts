import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const rejectAffiliateEndpoint = createAdminEndpoint(
	"/admin/affiliates/:id/reject",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const affiliate = await controller.rejectAffiliate(ctx.body.id);
		if (!affiliate) return { error: "Unable to reject affiliate" };
		return { affiliate };
	},
);
