import { createAdminEndpoint, z } from "@86d-app/core";
import type { OrderController } from "../../service";

export const adminDeleteFulfillment = createAdminEndpoint(
	"/admin/fulfillments/:id",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.order as OrderController;

		const existing = await controller.getFulfillment(ctx.params.id);
		if (!existing) {
			return { error: "Fulfillment not found", status: 404 };
		}

		await controller.deleteFulfillment(ctx.params.id);
		return { success: true };
	},
);
