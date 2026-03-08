import { createAdminEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const reviewQuoteEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/review",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.reviewQuote(ctx.body.id);
		if (!quote) return { error: "Cannot review this quote" };
		return { quote };
	},
);
