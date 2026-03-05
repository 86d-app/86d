import { createAdminEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const listSubscriptions = createAdminEndpoint(
	"/admin/subscriptions",
	{
		method: "GET",
		query: z.object({
			email: z.string().optional(),
			planId: z.string().optional(),
			status: z
				.enum(["active", "trialing", "cancelled", "expired", "past_due"])
				.optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const subscriptions = await controller.listSubscriptions({
			email: ctx.query.email,
			planId: ctx.query.planId,
			status: ctx.query.status,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { subscriptions, total: subscriptions.length };
	},
);
