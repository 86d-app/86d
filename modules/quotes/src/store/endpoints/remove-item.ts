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
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Authentication required", status: 401 };

		const controller = ctx.context.controllers.quotes as QuoteController;

		// Verify ownership before mutating
		const quote = await controller.getQuote(ctx.body.quoteId);
		if (!quote || quote.customerId !== customerId) {
			return { error: "Quote not found", status: 404 };
		}

		const removed = await controller.removeItem(
			ctx.body.quoteId,
			ctx.body.itemId,
		);
		if (!removed) return { error: "Cannot remove this item", status: 422 };
		return { success: true };
	},
);
