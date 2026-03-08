import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const counterQuoteEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/counter",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
			items: z.array(
				z.object({
					itemId: z.string(),
					offeredPrice: z.number().min(0),
				}),
			),
			expiresAt: z.coerce.date().optional(),
			adminNotes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.counterQuote(ctx.body.id, {
			items: ctx.body.items,
			expiresAt: ctx.body.expiresAt,
			adminNotes: ctx.body.adminNotes,
		});
		if (!quote) return { error: "Cannot counter this quote" };
		return { quote };
	},
);
