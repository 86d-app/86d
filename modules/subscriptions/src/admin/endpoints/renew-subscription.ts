import { createAdminEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const adminRenewSubscription = createAdminEndpoint(
	"/admin/subscriptions/:id/renew",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const subscription = await controller.renewSubscription(ctx.params.id);
		if (!subscription) {
			return { error: "Subscription not found", status: 404 };
		}
		return { subscription };
	},
);
