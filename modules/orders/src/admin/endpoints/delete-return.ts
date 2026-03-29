import { createAdminEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const adminDeleteReturn = createAdminEndpoint(
	"/admin/orders/returns/:id/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		const existing = await controller.getReturn(ctx.params.id);
		if (!existing) {
			return { error: "Return request not found", status: 404 };
		}

		await controller.deleteReturn(ctx.params.id);

		return { success: true };
	},
);
