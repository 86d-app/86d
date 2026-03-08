import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const approveQuoteEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/approve",
	{
		method: "POST",
		body: z.object({
			id: z.string(),
			expiresAt: z.coerce.date().optional(),
			adminNotes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.approveAsIs(ctx.body.id, {
			expiresAt: ctx.body.expiresAt,
			adminNotes: ctx.body.adminNotes,
		});
		if (!quote) return { error: "Cannot approve this quote" };
		return { quote };
	},
);
