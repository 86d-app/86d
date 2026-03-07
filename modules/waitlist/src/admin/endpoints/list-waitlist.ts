import { createAdminEndpoint, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const listWaitlist = createAdminEndpoint(
	"/admin/waitlist",
	{
		method: "GET",
		query: z.object({
			productId: z.string().optional(),
			email: z.string().optional(),
			status: z
				.enum(["waiting", "notified", "purchased", "cancelled"])
				.optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const entries = await controller.listAll({
			productId: ctx.query.productId,
			email: ctx.query.email,
			status: ctx.query.status,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { entries, total: entries.length };
	},
);
