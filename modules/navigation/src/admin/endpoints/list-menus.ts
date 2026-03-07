import { createAdminEndpoint, z } from "@86d-app/core";
import type { MenuLocation, NavigationController } from "../../service";

export const adminListMenusEndpoint = createAdminEndpoint(
	"/admin/navigation/menus",
	{
		method: "GET",
		query: z.object({
			location: z
				.enum(["header", "footer", "sidebar", "mobile", "custom"])
				.optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.navigation as NavigationController;
		const menus = await controller.listMenus(
			ctx.query.location
				? { location: ctx.query.location as MenuLocation }
				: undefined,
		);
		return { menus };
	},
);
