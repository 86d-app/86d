import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { NotificationsController } from "../../service";

export const updateNotificationEndpoint = createAdminEndpoint(
	"/admin/notifications/:id/update",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			title: z.string().max(500).transform(sanitizeText).optional(),
			body: z.string().max(5000).transform(sanitizeText).optional(),
			actionUrl: z.string().url().max(2000).optional(),
			metadata: z.record(z.string(), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.notifications as NotificationsController;
		const notification = await controller.update(ctx.params.id, {
			title: ctx.body.title,
			body: ctx.body.body,
			actionUrl: ctx.body.actionUrl,
			metadata: ctx.body.metadata,
		});
		if (!notification) return { error: "Notification not found" };
		return { notification };
	},
);
