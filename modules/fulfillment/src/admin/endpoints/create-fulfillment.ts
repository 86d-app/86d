import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { FulfillmentController } from "../../service";

export const createFulfillment = createAdminEndpoint(
	"/admin/fulfillment/create",
	{
		method: "POST",
		body: z.object({
			orderId: z.string().min(1),
			items: z
				.array(
					z.object({
						lineItemId: z.string().min(1),
						quantity: z.number().int().min(1),
					}),
				)
				.min(1),
			notes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.fulfillment as FulfillmentController;
		const fulfillment = await controller.createFulfillment({
			orderId: ctx.body.orderId,
			items: ctx.body.items,
			notes: ctx.body.notes,
		});
		return { fulfillment };
	},
);
