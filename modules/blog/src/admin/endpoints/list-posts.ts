import { createAdminEndpoint, z } from "@86d-app/core";
import type { BlogController, PostStatus } from "../../service";

export const adminListPostsEndpoint = createAdminEndpoint(
	"/admin/blog",
	{
		method: "GET",
		query: z.object({
			status: z.enum(["draft", "published", "archived"]).optional(),
			category: z.string().optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.blog as BlogController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const posts = await controller.listPosts({
			status: ctx.query.status as PostStatus | undefined,
			category: ctx.query.category,
			take: limit,
			skip,
		});
		return { posts, total: posts.length };
	},
);
