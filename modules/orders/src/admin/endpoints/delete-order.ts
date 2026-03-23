import { createAdminEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const adminDeleteOrder = createAdminEndpoint(
	"/admin/orders/:id/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;
		const existing = await controller.getById(ctx.params.id);
		if (!existing) {
			return { error: "Order not found", status: 404 };
		}
		await controller.delete(ctx.params.id);
		return { success: true };
	},
);
