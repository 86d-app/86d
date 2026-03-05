import { createAdminEndpoint, z } from "@86d-app/core";
import type { NewsletterController, SubscriberStatus } from "../../service";

export const listSubscribersEndpoint = createAdminEndpoint(
	"/admin/newsletter",
	{
		method: "GET",
		query: z.object({
			status: z.enum(["active", "unsubscribed", "bounced"]).optional(),
			tag: z.string().optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.newsletter as NewsletterController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const subscribers = await controller.listSubscribers({
			status: ctx.query.status as SubscriberStatus | undefined,
			tag: ctx.query.tag,
			take: limit,
			skip,
		});
		return { subscribers, total: subscribers.length };
	},
);
