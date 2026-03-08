import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const declineQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id/decline",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string(),
			reason: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.declineQuote(
			ctx.body.quoteId,
			ctx.body.reason,
		);
		if (!quote) return { error: "Cannot decline this quote" };
		return { quote };
	},
);
