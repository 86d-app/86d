import { createAdminEndpoint, z } from "@86d-app/core";
import type { AutomationsController } from "../../service";

export const activateAutomation = createAdminEndpoint(
	"/admin/automations/:id/activate",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.automations as AutomationsController;
		try {
			const automation = await controller.activate(ctx.params.id);
			return { automation };
		} catch {
			return { error: "Automation not found", status: 404 };
		}
	},
);
