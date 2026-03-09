import { createStoreEndpoint } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

export const getFeedBySlug = createStoreEndpoint(
	"/feeds/:slug",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;

		const feed = await controller.getFeedBySlug(ctx.params.slug);
		if (!feed) {
			return { error: "Feed not found" };
		}

		if (feed.status !== "active") {
			return { error: "Feed is not active" };
		}

		const output = await controller.getFeedOutput(feed.id);
		if (!output) {
			return { error: "Feed has not been generated yet" };
		}

		return {
			output,
			format: feed.format,
			itemCount: feed.itemCount,
			lastGeneratedAt: feed.lastGeneratedAt,
		};
	},
);
