import { createAdminEndpoint, z } from "@86d-app/core";
import type { PhotoBoothController } from "../../service";

export const listSessionsEndpoint = createAdminEndpoint(
	"/admin/photo-booth/sessions",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.photoBooth as PhotoBoothController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const sessions = await controller.listSessions({
			take: limit,
			skip,
		});
		return { sessions, total: sessions.length };
	},
);
