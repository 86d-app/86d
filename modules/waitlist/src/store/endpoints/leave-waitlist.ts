import { createStoreEndpoint, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const leaveWaitlist = createStoreEndpoint(
	"/waitlist/leave",
	{
		method: "POST",
		body: z.object({
			email: z.string().email(),
			productId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const cancelled = await controller.cancelByEmail(
			ctx.body.email,
			ctx.body.productId,
		);
		return { cancelled };
	},
);
