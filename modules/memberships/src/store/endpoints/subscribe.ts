import { createStoreEndpoint, z } from "@86d-app/core";
import type { MembershipController } from "../../service";

export const subscribe = createStoreEndpoint(
	"/memberships/subscribe",
	{
		method: "POST",
		body: z.object({
			customerId: z.string().min(1),
			planId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.memberships as MembershipController;

		try {
			const membership = await controller.subscribe({
				customerId: ctx.body.customerId,
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
