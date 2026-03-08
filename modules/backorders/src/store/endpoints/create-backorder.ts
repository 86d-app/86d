import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const createBackorder = createStoreEndpoint(
	"/backorders/create",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			productName: z.string().max(500).transform(sanitizeText),
			variantId: z.string().max(200).optional(),
			variantLabel: z.string().max(200).transform(sanitizeText).optional(),
			customerId: z.string(),
			customerEmail: z.string().email().max(320),
			orderId: z.string().optional(),
			quantity: z.number().int().min(1).max(9999),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const backorder = await controller.createBackorder({
			productId: ctx.body.productId,
			productName: ctx.body.productName,
			variantId: ctx.body.variantId,
			variantLabel: ctx.body.variantLabel,
			customerId: ctx.body.customerId,
			customerEmail: ctx.body.customerEmail,
			orderId: ctx.body.orderId,
			quantity: ctx.body.quantity,
		});
		if (!backorder) {
			return { error: "Backorder not eligible", backorder: null };
		}
		return { backorder };
	},
);
