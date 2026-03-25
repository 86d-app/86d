import { createAdminEndpoint, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const notifyWaitlist = createAdminEndpoint(
	"/admin/waitlist/:productId/notify",
	{
		method: "POST",
		params: z.object({ productId: z.string().max(200) }),
		body: z.object({
			productId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const notifiedCount = await controller.markNotified(ctx.params.productId);
		return { notifiedCount };
	},
);
