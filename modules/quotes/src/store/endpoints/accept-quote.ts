import { createStoreEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const acceptQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id/accept",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string().max(200),
		}),
	},
	async (ctx) => {
		const session = ctx.context.session;
		if (!session) {
			return { error: "Authentication required", status: 401 };
		}

		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.acceptQuote(ctx.body.quoteId);
		if (!quote) return { error: "Cannot accept this quote", status: 400 };

		if (quote.customerId && quote.customerId !== session.user.id) {
			return { error: "Quote not found", status: 404 };
		}

		return { quote };
	},
);
