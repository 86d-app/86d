import { createAdminEndpoint, z } from "@86d-app/core";
import type { WalmartController } from "../../service";

export const submitFeedEndpoint = createAdminEndpoint(
	"/admin/walmart/feeds",
	{
		method: "POST",
		body: z.object({
			feedType: z.enum(["item", "inventory", "price", "order"]),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.walmart as WalmartController;
		const feed = await controller.submitFeed(ctx.body.feedType);
		return { feed };
	},
);
