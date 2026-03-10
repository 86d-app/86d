import { createStoreEndpoint } from "@86d-app/core";
import type { SubscriptionController } from "../../service";

export const getMySubscriptions = createStoreEndpoint(
	"/subscriptions/me",
	{
		method: "GET",
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.subscriptions as SubscriptionController;
		const subscriptions = await controller.listSubscriptions({
			email: session.user.email,
		});
		return { subscriptions };
	},
);
