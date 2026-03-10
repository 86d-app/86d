import { createStoreEndpoint, z } from "@86d-app/core";
import type { MembershipController } from "../../service";

export const subscribe = createStoreEndpoint(
	"/memberships/subscribe",
	{
		method: "POST",
		body: z.object({
			planId: z.string().min(1).max(200),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers
			.memberships as MembershipController;

		try {
			const membership = await controller.subscribe({
				customerId: session.user.id,
				planId: ctx.body.planId,
			});
			return { membership };
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Subscription failed";
			return { error: message, status: 400 };
		}
	},
);
