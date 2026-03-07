import { createAdminEndpoint, z } from "@86d-app/core";
import type { PagesController } from "../../service";

export const adminGetPageEndpoint = createAdminEndpoint(
	"/admin/pages/:id",
	{
		method: "GET",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.pages as PagesController;
		const page = await controller.getPage(ctx.params.id);
		return { page };
	},
);
