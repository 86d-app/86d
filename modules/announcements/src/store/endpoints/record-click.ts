import { createStoreEndpoint, z } from "@86d-app/core";
import type { AnnouncementsController } from "../../service";

export const recordClick = createStoreEndpoint(
	"/announcements/:id/click",
	{
		method: "POST",
		params: z.object({
			id: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.announcements as AnnouncementsController;

		await controller.recordClick(ctx.params.id);

		return { success: true };
	},
);
