import { createAdminEndpoint, z } from "@86d-app/core";
import type { FeedItemStatus, GoogleShoppingController } from "../../service";

export const listFeedItemsEndpoint = createAdminEndpoint(
	"/admin/google-shopping/feed-items",
	{
		method: "GET",
		query: z.object({
			status: z
				.enum(["active", "pending", "disapproved", "expiring"])
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"google-shopping"
		] as GoogleShoppingController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const items = await controller.listFeedItems({
			status: ctx.query.status as FeedItemStatus | undefined,
			take: limit,
			skip,
		});
		return { items, total: items.length };
	},
);
