import { createAdminEndpoint, z } from "@86d-app/core";
import type { WarrantyController } from "../../service";

export const deletePlan = createAdminEndpoint(
	"/admin/warranties/plans/:id/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.warranties as WarrantyController;
		const deleted = await controller.deletePlan(ctx.params.id);
		if (!deleted) {
			return { error: "Plan not found", status: 404 };
		}
		return { success: true };
	},
);
