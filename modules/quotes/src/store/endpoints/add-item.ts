import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const addItemEndpoint = createStoreEndpoint(
	"/quotes/:id/items/add",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string().max(200),
			productId: z.string().max(200),
			productName: z.string().min(1).max(500).transform(sanitizeText),
			sku: z.string().max(100).optional(),
			quantity: z.number().int().min(1),
			unitPrice: z.number().min(0),
			notes: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const item = await controller.addItem({
			quoteId: ctx.body.quoteId,
			productId: ctx.body.productId,
			productName: ctx.body.productName,
			sku: ctx.body.sku,
			quantity: ctx.body.quantity,
			unitPrice: ctx.body.unitPrice,
			notes: ctx.body.notes,
		});
		if (!item) return { error: "Cannot add item to this quote" };
		return { item };
	},
);
