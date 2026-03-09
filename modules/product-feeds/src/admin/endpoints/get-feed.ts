import { createAdminEndpoint } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

export const getFeed = createAdminEndpoint(
	"/admin/product-feeds/:id",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;
		const feed = await controller.getFeed(ctx.params.id);
		if (!feed) {
			return { error: "Feed not found" };
		}
		return { feed };
	},
);
