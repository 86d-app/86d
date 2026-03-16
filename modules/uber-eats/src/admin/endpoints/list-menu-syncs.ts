import { createAdminEndpoint, z } from "@86d-app/core";
import type { UberEatsController } from "../../service";

export const listMenuSyncsEndpoint = createAdminEndpoint(
	"/admin/uber-eats/menu-syncs",
	{
		method: "GET",
		query: z.object({
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const syncs = await controller.listMenuSyncs({ take: limit, skip });
		return { syncs, total: syncs.length };
	},
);
