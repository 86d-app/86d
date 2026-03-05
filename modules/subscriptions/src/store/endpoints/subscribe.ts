import { createStoreEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const subscribe = createStoreEndpoint(
	"/subscriptions/subscribe",
	{
		method: "POST",
		body: z.object({
			planId: z.string(),
			email: z.string().email(),
			customerId: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const plan = await controller.getPlan(ctx.body.planId);
		if (!plan) return { error: "Plan not found", status: 404 };
		if (!plan.isActive) return { error: "Plan is not active", status: 400 };
		const subscription = await controller.subscribe({
			planId: ctx.body.planId,
			email: ctx.body.email,
			customerId: ctx.body.customerId,
		});
		return { subscription };
	},
);
