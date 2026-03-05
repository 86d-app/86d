import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { BlogController } from "../../service";

export const updatePostEndpoint = createAdminEndpoint(
	"/admin/blog/:id",
	{
		method: "PUT",
		params: z.object({ id: z.string() }),
		body: z.object({
			title: z.string().min(1).max(500).transform(sanitizeText).optional(),
			slug: z.string().max(500).transform(sanitizeText).optional(),
			content: z.string().min(1).optional(),
			excerpt: z.string().max(1000).transform(sanitizeText).optional(),
			coverImage: z.string().url().optional().nullable(),
			author: z.string().max(200).transform(sanitizeText).optional(),
			status: z.enum(["draft", "published", "archived"]).optional(),
			tags: z.array(z.string().max(100)).max(20).optional(),
			category: z.string().max(200).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.blog as BlogController;
		const post = await controller.updatePost(ctx.params.id, {
			title: ctx.body.title,
			slug: ctx.body.slug,
			content: ctx.body.content,
			excerpt: ctx.body.excerpt,
			coverImage: ctx.body.coverImage ?? undefined,
			author: ctx.body.author,
			status: ctx.body.status,
			tags: ctx.body.tags,
			category: ctx.body.category,
		});
		return { post };
	},
);
