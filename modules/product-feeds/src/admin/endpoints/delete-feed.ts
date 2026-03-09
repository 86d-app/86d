import { createAdminEndpoint } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

export const deleteFeed = createAdminEndpoint(
	"/admin/product-feeds/:id/delete",
	{
		method: "POST",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;

		const deleted = await controller.deleteFeed(ctx.params.id);
		if (!deleted) {
			return { error: "Feed not found" };
		}

		return { success: true };
	},
);
