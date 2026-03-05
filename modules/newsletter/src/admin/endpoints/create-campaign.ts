import { createAdminEndpoint, z } from "@86d-app/core";
import type { NewsletterController } from "../../service";

export const createCampaignEndpoint = createAdminEndpoint(
	"/admin/newsletter/campaigns/create",
	{
		method: "POST",
		body: z.object({
			subject: z.string().min(1).max(200),
			body: z.string().min(1),
			tags: z.array(z.string()).optional(),
			scheduledAt: z.coerce.date().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.newsletter as NewsletterController;
		const campaign = await controller.createCampaign({
			subject: ctx.body.subject,
			body: ctx.body.body,
			tags: ctx.body.tags,
			scheduledAt: ctx.body.scheduledAt,
		});
		return { campaign };
	},
);
