import { createStoreEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const getQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id",
	{
		method: "GET",
		query: z.object({
			id: z.string().max(200),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.getQuote(ctx.query.id);
		if (!quote) return { error: "Quote not found" };

		const items = await controller.getItems(ctx.query.id);
		const comments = await controller.getComments(ctx.query.id);
		return { quote, items, comments };
	},
);
