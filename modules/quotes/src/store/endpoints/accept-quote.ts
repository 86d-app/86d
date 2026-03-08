import { createStoreEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const acceptQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id/accept",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.acceptQuote(ctx.body.quoteId);
		if (!quote) return { error: "Cannot accept this quote" };
		return { quote };
	},
);
