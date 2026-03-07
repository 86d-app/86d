import { createAdminEndpoint, z } from "@86d-app/core";
import type { SeoController } from "../../service";

export const listRedirectsEndpoint = createAdminEndpoint(
	"/admin/seo/redirects",
	{
		method: "GET",
		query: z.object({
			active: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.seo as SeoController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const redirects = await controller.listRedirects({
			active: ctx.query.active,
			take: limit,
			skip,
		});
		return { redirects, total: redirects.length };
	},
);
