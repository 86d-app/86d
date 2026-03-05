import { createAdminEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const listPlans = createAdminEndpoint(
	"/admin/subscriptions/plans",
	{
		method: "GET",
		query: z.object({
			activeOnly: z
				.string()
				.optional()
				.transform((v) => v === "true"),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const plans = await controller.listPlans({
			activeOnly: ctx.query.activeOnly,
		});
		return { plans };
	},
);
