import { createStoreEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const submitQuoteEndpoint = createStoreEndpoint(
	"/quotes/:id/submit",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string().max(200),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Authentication required", status: 401 };

		const controller = ctx.context.controllers.quotes as QuoteController;

		// Verify ownership before mutating
		const existing = await controller.getQuote(ctx.body.quoteId);
		if (!existing || existing.customerId !== customerId) {
			return { error: "Quote not found", status: 404 };
		}

		const quote = await controller.submitQuote(ctx.body.quoteId);
		if (!quote) return { error: "Cannot submit this quote", status: 422 };
		return { quote };
	},
);
