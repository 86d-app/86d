import { createAdminEndpoint, z } from "@86d-app/core";
import type { WaitlistController } from "../../service";

export const deleteEntry = createAdminEndpoint(
	"/admin/waitlist/:id/delete",
	{
		method: "POST",
		body: z.object({}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.waitlist as WaitlistController;
		const deleted = await controller.unsubscribe(ctx.params.id);
		return { deleted };
	},
);
