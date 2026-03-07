import { createStoreEndpoint, z } from "@86d-app/core";
import type { PagesController } from "../../service";

export const getPageEndpoint = createStoreEndpoint(
	"/pages/:slug",
	{
		method: "GET",
		params: z.object({ slug: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.pages as PagesController;
		const page = await controller.getPageBySlug(ctx.params.slug);
		if (!page || page.status !== "published") {
			return { page: null };
		}
		return { page };
	},
);
