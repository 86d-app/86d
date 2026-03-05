import { createAdminEndpoint, z } from "@86d-app/core";
import type { BlogController } from "../../service";

export const adminGetPostEndpoint = createAdminEndpoint(
	"/admin/blog/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.blog as BlogController;
		const post = await controller.getPost(ctx.params.id);
		return { post };
	},
);
