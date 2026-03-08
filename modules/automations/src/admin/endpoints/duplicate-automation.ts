import { createAdminEndpoint, z } from "@86d-app/core";
import type { AutomationsController } from "../../service";

export const duplicateAutomation = createAdminEndpoint(
	"/admin/automations/:id/duplicate",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.automations as AutomationsController;
		try {
			const automation = await controller.duplicate(ctx.params.id);
			return { automation, status: 201 };
		} catch {
			return { error: "Automation not found", status: 404 };
		}
	},
);
