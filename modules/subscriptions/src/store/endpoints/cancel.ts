import { createStoreEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const cancelSubscription = createStoreEndpoint(
	"/subscriptions/me/cancel",
	{
		method: "POST",
		body: z.object({
			id: z.string().max(200),
			cancelAtPeriodEnd: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const subscription = await controller.cancelSubscription({
			id: ctx.body.id,
			cancelAtPeriodEnd: ctx.body.cancelAtPeriodEnd,
		});

		if (
			subscription?.customerId &&
			subscription.customerId !== session.user.id
		) {
			return { error: "Subscription not found", status: 404 };
		}

		return { subscription };
	},
);
