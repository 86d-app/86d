import { createAdminEndpoint, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const expireQuoteEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/expire",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.expireQuote(ctx.body.id);
		if (!quote) return { error: "Cannot expire this quote" };
		return { quote };
	},
);
