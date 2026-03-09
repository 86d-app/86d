import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { AnnouncementsController } from "../../service";

export const updateAnnouncement = createAdminEndpoint(
	"/admin/announcements/:id/update",
	{
		method: "PUT",
		params: z.object({
			id: z.string().min(1),
		}),
		body: z.object({
			title: z
				.string()
				.min(1)
				.transform(sanitizeText)
				.refine((s) => s.length >= 1, "Title is required")
				.optional(),
			content: z.string().min(1).optional(),
			type: z.enum(["bar", "banner", "popup"]).optional(),
			position: z.enum(["top", "bottom"]).optional(),
			linkUrl: z.string().optional(),
			linkText: z.string().optional(),
			backgroundColor: z.string().optional(),
			textColor: z.string().optional(),
			iconName: z.string().optional(),
			priority: z.number().int().min(0).optional(),
			isActive: z.boolean().optional(),
			isDismissible: z.boolean().optional(),
			startsAt: z.coerce.date().optional(),
			endsAt: z.coerce.date().optional(),
			targetAudience: z.enum(["all", "authenticated", "guest"]).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.announcements as AnnouncementsController;

		const announcement = await controller.updateAnnouncement(
			ctx.params.id,
			ctx.body,
		);

		return { announcement };
	},
);
