import { createAdminEndpoint, z } from "@86d-app/core";
import type { PhotoBoothController } from "../../service";

export const endSessionEndpoint = createAdminEndpoint(
	"/admin/photo-booth/sessions/:id/end",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.photoBooth as PhotoBoothController;
		const session = await controller.endSession(ctx.params.id);
		return { session };
	},
);
