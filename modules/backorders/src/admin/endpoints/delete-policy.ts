import { createAdminEndpoint, z } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const deletePolicy = createAdminEndpoint(
	"/admin/backorders/policies/:productId/delete",
	{
		method: "POST",
		body: z.object({}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const deleted = await controller.deletePolicy(ctx.params.productId);
		return { deleted };
	},
);
