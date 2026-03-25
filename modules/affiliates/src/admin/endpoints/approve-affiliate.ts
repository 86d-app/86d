import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const approveAffiliateEndpoint = createAdminEndpoint(
	"/admin/affiliates/:id/approve",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({
			commissionRate: z.number().min(0).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const affiliate = await controller.approveAffiliate(
			ctx.params.id,
			ctx.body.commissionRate,
		);
		if (!affiliate) return { error: "Unable to approve affiliate" };
		return { affiliate };
	},
);
