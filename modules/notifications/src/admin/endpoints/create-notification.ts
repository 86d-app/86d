import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { NotificationsController } from "../../service";

export const createNotificationEndpoint = createAdminEndpoint(
	"/admin/notifications/create",
	{
		method: "POST",
		body: z.object({
			customerId: z.string(),
			type: z
				.enum([
					"info",
					"success",
					"warning",
					"error",
					"order",
					"shipping",
					"promotion",
				])
				.optional(),
			channel: z.enum(["in_app", "email", "both"]).optional(),
			title: z.string().max(500).transform(sanitizeText),
			body: z.string().max(5000).transform(sanitizeText),
			actionUrl: z.string().url().max(2000).optional(),
			metadata: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 50, "Too many keys")
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.notifications as NotificationsController;
		const notification = await controller.create({
			customerId: ctx.body.customerId,
			type: ctx.body.type,
			channel: ctx.body.channel,
			title: ctx.body.title,
			body: ctx.body.body,
			actionUrl: ctx.body.actionUrl,
			metadata: ctx.body.metadata,
		});
		return { notification };
	},
);
