import { createAdminEndpoint, z } from "@86d-app/core";
import type { ReferralController, ReferralStatus } from "../../service";

export const listReferralsEndpoint = createAdminEndpoint(
	"/admin/referrals",
	{
		method: "GET",
		query: z.object({
			referrerCustomerId: z.string().optional(),
			refereeCustomerId: z.string().optional(),
			status: z.enum(["pending", "completed", "expired", "revoked"]).optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.referrals as ReferralController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const referrals = await controller.listReferrals({
			referrerCustomerId: ctx.query.referrerCustomerId,
			refereeCustomerId: ctx.query.refereeCustomerId,
			status: ctx.query.status as ReferralStatus | undefined,
			take: limit,
			skip,
		});
		return { referrals, total: referrals.length };
	},
);
