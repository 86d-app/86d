import { createStoreEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const removeItemEndpoint = createStoreEndpoint(
	"/quotes/:id/items/remove",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string().max(200),
			itemId: z.string().max(200),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const removed = await controller.removeItem(
			ctx.body.quoteId,
			ctx.body.itemId,
		);
		if (!removed) return { error: "Cannot remove this item" };
		return { success: true };
	},
);
