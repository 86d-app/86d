import { createStoreEndpoint, z } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const getMySubscriptions = createStoreEndpoint(
	"/subscriptions/me",
	{
		method: "GET",
		query: z.object({
			email: z.string().email(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const subscriptions = await controller.listSubscriptions({
			email: ctx.query.email,
		});
		return { subscriptions };
	},
);
