import { createAdminEndpoint, z } from "@86d-app/core";
import type { AnnouncementsController } from "../../service";

export const getAnnouncement = createAdminEndpoint(
	"/admin/announcements/:id",
	{
		method: "GET",
		params: z.object({
			id: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.announcements as AnnouncementsController;

		const announcement = await controller.getAnnouncement(ctx.params.id);

		if (!announcement) {
			throw new Error(`Announcement ${ctx.params.id} not found`);
		}

		return { announcement };
	},
);
