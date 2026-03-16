import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const updateItemEndpoint = createStoreEndpoint(
	"/quotes/:id/items/update",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string().max(200),
			itemId: z.string().max(200),
			quantity: z.number().int().min(1).optional(),
			unitPrice: z.number().min(0).optional(),
			notes: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const item = await controller.updateItem(
			ctx.body.quoteId,
			ctx.body.itemId,
			{
				quantity: ctx.body.quantity,
				unitPrice: ctx.body.unitPrice,
				notes: ctx.body.notes,
			},
		);
		if (!item) return { error: "Cannot update this item" };
		return { item };
	},
);
