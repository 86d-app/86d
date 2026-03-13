import { createStoreEndpoint, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const leaveWaitlist = createStoreEndpoint(
	"/waitlist/leave",
	{
		method: "POST",
		body: z.object({
			productId: z.string().max(200),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const cancelled = await controller.cancelByEmail(
			session.user.email,
			ctx.body.productId,
		);
		return { cancelled };
	},
);
