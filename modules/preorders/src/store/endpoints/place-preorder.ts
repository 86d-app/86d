import { createStoreEndpoint, z } from "@86d-app/core";
import type { PreordersController } from "../../service";

export const placePreorder = createStoreEndpoint(
	"/preorders/place",
	{
		method: "POST",
		body: z.object({
			campaignId: z.string(),
			customerId: z.string(),
			customerEmail: z.string().email().max(320),
			quantity: z.number().int().min(1).max(9999),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.preorders as PreordersController;
		const item = await controller.placePreorder({
			campaignId: ctx.body.campaignId,
			customerId: ctx.body.customerId,
			customerEmail: ctx.body.customerEmail,
			quantity: ctx.body.quantity,
		});
		if (!item) {
			return { error: "Preorder not available", item: null };
		}
		return { item };
	},
);
