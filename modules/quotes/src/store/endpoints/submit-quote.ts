import { createStoreEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const submitQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id/submit",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.submitQuote(ctx.body.quoteId);
		if (!quote) return { error: "Cannot submit this quote" };
		return { quote };
	},
);
