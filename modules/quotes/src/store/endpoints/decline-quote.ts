import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const declineQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id/decline",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string().max(200),
			reason: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.declineQuote(
			ctx.body.quoteId,
			ctx.body.reason,
		);
		if (!quote) return { error: "Cannot decline this quote", status: 400 };

		if (quote.customerId && quote.customerId !== session.user.id) {
			return { error: "Quote not found", status: 404 };
		}

		return { quote };
	},
);
