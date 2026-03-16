import { createAdminEndpoint, z } from "@86d-app/core";
import type { FavorController } from "../../service";

export const listServiceAreas = createAdminEndpoint(
	"/admin/favor/service-areas",
	{
		method: "GET",
		query: z.object({
			take: z.coerce.number().int().min(1).max(100).optional(),
			skip: z.coerce.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.favor as FavorController;
		const areas = await controller.listServiceAreas({
			take: ctx.query.take ?? 50,
			skip: ctx.query.skip ?? 0,
		});
		return { areas, total: areas.length };
	},
);
