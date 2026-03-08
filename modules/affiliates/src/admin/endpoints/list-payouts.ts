import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController, PayoutStatus } from "../../service";

export const listPayoutsEndpoint = createAdminEndpoint(
	"/admin/affiliates/payouts",
	{
		method: "GET",
		query: z.object({
			affiliateId: z.string().optional(),
			status: z
				.enum(["pending", "processing", "completed", "failed"])
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const payouts = await controller.listPayouts({
			affiliateId: ctx.query.affiliateId,
			status: ctx.query.status as PayoutStatus | undefined,
			take: limit,
			skip,
		});
		return { payouts, total: payouts.length };
	},
);
