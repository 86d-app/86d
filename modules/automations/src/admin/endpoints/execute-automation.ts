import { createAdminEndpoint, z } from "@86d-app/core";
import type { AutomationsController } from "../../service";

export const executeAutomation = createAdminEndpoint(
	"/admin/automations/:id/execute",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			payload: z.record(z.string(), z.unknown()).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.automations as AutomationsController;
		try {
			const execution = await controller.execute(
				ctx.params.id,
				ctx.body.payload ?? {},
			);
			return { execution };
		} catch {
			return { error: "Automation not found", status: 404 };
		}
	},
);
