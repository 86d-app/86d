import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const getAffiliateEndpoint = createAdminEndpoint(
	"/admin/affiliates/:id",
	{
		method: "GET",
		query: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const affiliate = await controller.getAffiliate(ctx.query.id);
		if (!affiliate) return { error: "Affiliate not found" };

		const balance = await controller.getAffiliateBalance(affiliate.id);
		const links = await controller.listLinks({
			affiliateId: affiliate.id,
		});
		const conversions = await controller.listConversions({
			affiliateId: affiliate.id,
			take: 20,
		});
		const payouts = await controller.listPayouts({
			affiliateId: affiliate.id,
			take: 20,
		});

		return { affiliate, balance, links, conversions, payouts };
	},
);
