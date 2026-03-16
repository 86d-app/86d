import { createAdminEndpoint, z } from "@86d-app/core";
import type { PhotoBoothController } from "../../service";

export const toggleStreamEndpoint = createAdminEndpoint(
	"/admin/photo-booth/streams/:id/toggle",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.photoBooth as PhotoBoothController;
		const stream = await controller.toggleStreamLive(ctx.params.id);
		return { stream };
	},
);
