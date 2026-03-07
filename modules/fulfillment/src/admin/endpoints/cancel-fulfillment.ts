import { createAdminEndpoint, z } from "@86d-app/core";
import type { FulfillmentController } from "../../service";

export const cancelFulfillment = createAdminEndpoint(
	"/admin/fulfillment/:id/cancel",
	{
		method: "POST",
		params: z.object({ id: z.string().min(1) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.fulfillment as FulfillmentController;
		const fulfillment = await controller.cancelFulfillment(ctx.params.id);
		if (!fulfillment) {
			throw new Error("Fulfillment not found");
		}
		return { fulfillment };
	},
);
