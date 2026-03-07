import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { NavigationController } from "../../service";

export const createMenuEndpoint = createAdminEndpoint(
	"/admin/navigation/menus",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText),
			slug: z.string().max(200).transform(sanitizeText).optional(),
			location: z.enum(["header", "footer", "sidebar", "mobile", "custom"]),
			isActive: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.navigation as NavigationController;
		const menu = await controller.createMenu({
			name: ctx.body.name,
			slug: ctx.body.slug,
			location: ctx.body.location,
			isActive: ctx.body.isActive,
		});
		return { menu };
	},
);
