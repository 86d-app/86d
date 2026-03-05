import { createStoreEndpoint, z } from "@86d-app/core";
import type { BlogController } from "../../service";

export const getPostEndpoint = createStoreEndpoint(
	"/blog/:slug",
	{
		method: "GET",
		params: z.object({ slug: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.blog as BlogController;
		const post = await controller.getPostBySlug(ctx.params.slug);
		if (!post || post.status !== "published") {
			return { post: null };
		}
		return { post };
	},
);
