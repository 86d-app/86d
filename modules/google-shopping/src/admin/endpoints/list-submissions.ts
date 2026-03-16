import { createAdminEndpoint, z } from "@86d-app/core";
import type { GoogleShoppingController } from "../../service";

export const listSubmissionsEndpoint = createAdminEndpoint(
	"/admin/google-shopping/submissions",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"google-shopping"
		] as GoogleShoppingController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const submissions = await controller.listSubmissions({
			take: limit,
			skip,
		});
		return { submissions, total: submissions.length };
	},
);
