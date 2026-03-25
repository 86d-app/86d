import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const approveQuoteEndpoint = createAdminEndpoint(
	"/admin/quotes/:id/approve",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
		body: z.object({
			expiresAt: z.coerce.date().optional(),
			adminNotes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.approveAsIs(ctx.params.id, {
			expiresAt: ctx.body.expiresAt,
			adminNotes: ctx.body.adminNotes,
		});
		if (!quote) return { error: "Cannot approve this quote" };
		return { quote };
	},
);
