import { createAdminEndpoint, z } from "@86d-app/core";
import type { FulfillmentController } from "../../service";

export const updateStatus = createAdminEndpoint(
	"/admin/fulfillment/:id/status",
	{
		method: "POST",
		params: z.object({ id: z.string().min(1) }),
		body: z.object({
			status: z.enum([
				"pending",
				"processing",
				"shipped",
				"delivered",
				"cancelled",
			]),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.fulfillment as FulfillmentController;
		const fulfillment = await controller.updateStatus(
			ctx.params.id,
			ctx.body.status,
		);
		if (!fulfillment) {
			throw new Error("Fulfillment not found");
		}
		return { fulfillment };
	},
);
