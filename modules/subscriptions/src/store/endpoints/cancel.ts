import { createStoreEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const cancelSubscription = createStoreEndpoint(
	"/subscriptions/me/cancel",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
			cancelAtPeriodEnd: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const subscription = await controller.cancelSubscription({
			id: ctx.body.id,
			cancelAtPeriodEnd: ctx.body.cancelAtPeriodEnd,
		});
		return { subscription };
	},
);
