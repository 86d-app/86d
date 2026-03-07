import { createAdminEndpoint, z } from "@86d-app/core";
import type { PagesController } from "../../service";

export const adminListPagesEndpoint = createAdminEndpoint(
	"/admin/pages",
	{
		method: "GET",
		query: z.object({
			status: z.enum(["draft", "published", "archived"]).optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.pages as PagesController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const pages = await controller.listPages({
			status: ctx.query.status,
			take: limit,
			skip,
		});
		return { pages, total: pages.length };
	},
);
