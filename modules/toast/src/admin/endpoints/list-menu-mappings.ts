import { createAdminEndpoint, z } from "@86d-app/core";
import type { ToastController } from "../../service";

export const listMenuMappingsEndpoint = createAdminEndpoint(
	"/admin/toast/menu-mappings",
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
		const controller = ctx.context.controllers.toast as ToastController;
		const limit = ctx.query.limit ?? 50;
		const page = ctx.query.page ?? 1;
		const skip = (page - 1) * limit;
		const mappings = await controller.listMenuMappings({
			isActive: ctx.query.isActive,
			take: limit,
			skip,
		});
		return { mappings, total: mappings.length };
	},
);
