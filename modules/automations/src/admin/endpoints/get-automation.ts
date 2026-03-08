import { createAdminEndpoint, z } from "@86d-app/core";
import type { AutomationsController } from "../../service";

export const getAutomation = createAdminEndpoint(
	"/admin/automations/:id",
	{
		method: "GET",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.automations as AutomationsController;
		const automation = await controller.getById(ctx.params.id);
		if (!automation) {
			return { error: "Automation not found", status: 404 };
		}
		return { automation };
	},
);
