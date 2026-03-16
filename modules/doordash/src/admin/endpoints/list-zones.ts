import { createAdminEndpoint, z } from "@86d-app/core";
import type { DoordashController } from "../../service";

export const listZonesEndpoint = createAdminEndpoint(
	"/admin/doordash/zones",
	{
		method: "GET",
		query: z.object({
			isActive: z
				.enum(["true", "false"])
				.transform((v) => v === "true")
				.optional(),
			page: z.coerce.number().int().min(1).optional(),
			limit: z.coerce.number().int().min(1).max(100).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.doordash as DoordashController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const zones = await controller.listZones({
			isActive: ctx.query.isActive,
			take: limit,
			skip,
		});
		return { zones, total: zones.length };
	},
);
