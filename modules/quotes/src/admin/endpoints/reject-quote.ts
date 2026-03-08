import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const rejectQuoteEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/reject",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
			reason: z.string().max(1000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.rejectQuote(ctx.body.id, ctx.body.reason);
		if (!quote) return { error: "Cannot reject this quote" };
		return { quote };
	},
);
