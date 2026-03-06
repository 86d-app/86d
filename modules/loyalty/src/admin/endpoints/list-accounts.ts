import { createAdminEndpoint, z } from "@86d-app/core";
import type { LoyaltyController } from "../../service";

export const listAccounts = createAdminEndpoint(
	"/admin/loyalty/accounts",
	{
		method: "GET",
		query: z.object({
			tier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
			status: z.enum(["active", "suspended", "closed"]).optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.loyalty as LoyaltyController;
		const accounts = await controller.listAccounts({
			tier: ctx.query.tier,
			status: ctx.query.status,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { accounts, total: accounts.length };
	},
);
