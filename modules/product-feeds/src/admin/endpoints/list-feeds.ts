import { createAdminEndpoint, z } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

export const listFeeds = createAdminEndpoint(
	"/admin/product-feeds",
	{
		method: "GET",
		query: z.object({
			status: z.string().optional(),
			channel: z.string().optional(),
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;
		const feeds = await controller.listFeeds({
			status: ctx.query.status as
				| "active"
				| "paused"
				| "error"
				| "draft"
				| undefined,
			channel: ctx.query.channel as
				| "google-shopping"
				| "facebook"
				| "microsoft"
				| "pinterest"
				| "tiktok"
				| "custom"
				| undefined,
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { feeds, total: feeds.length };
	},
);
