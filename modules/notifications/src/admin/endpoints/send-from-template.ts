import { createAdminEndpoint, z } from "@86d-app/core";
import type { NotificationsController } from "../../service";

export const sendFromTemplateEndpoint = createAdminEndpoint(
	"/admin/notifications/templates/send",
	{
		method: "POST",
		body: z.object({
			templateId: z.string(),
			customerIds: z.array(z.string()).min(1).max(500),
			variables: z
				.record(z.string().max(50), z.string().max(1000))
				.refine((r) => Object.keys(r).length <= 20, "Too many variables")
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.notifications as NotificationsController;
		const result = await controller.sendFromTemplate({
			templateId: ctx.body.templateId,
			customerIds: ctx.body.customerIds,
			variables: ctx.body.variables,
		});
		return result;
	},
);
