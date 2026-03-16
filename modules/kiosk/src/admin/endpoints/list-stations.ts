import { createAdminEndpoint, z } from "@86d-app/core";
import type { KioskController } from "../../service";

export const listStationsEndpoint = createAdminEndpoint(
	"/admin/kiosk/stations",
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
		const controller = ctx.context.controllers.kiosk as KioskController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const stations = await controller.listStations({
			isActive: ctx.query.isActive,
			take: limit,
			skip,
		});
		return { stations, total: stations.length };
	},
);
