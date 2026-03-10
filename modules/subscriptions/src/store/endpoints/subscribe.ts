import { createStoreEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const subscribe = createStoreEndpoint(
	"/subscriptions/subscribe",
	{
		method: "POST",
		body: z.object({
			planId: z.string().max(200),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const plan = await controller.getPlan(ctx.body.planId);
		if (!plan) return { error: "Plan not found", status: 404 };
		if (!plan.isActive) return { error: "Plan is not active", status: 400 };
		const subscription = await controller.subscribe({
			planId: ctx.body.planId,
			email: session.user.email,
			customerId: session.user.id,
		});
		return { subscription };
	},
);
