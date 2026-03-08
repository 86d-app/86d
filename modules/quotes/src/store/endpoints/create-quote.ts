import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const createQuoteEndpoint = createStoreEndpoint(
	"/quotes/create",
	{
		method: "POST",
		body: z.object({
			customerEmail: z.string().email().max(320),
			customerName: z.string().min(1).max(200).transform(sanitizeText),
			companyName: z.string().max(200).transform(sanitizeText).optional(),
			notes: z.string().max(2000).transform(sanitizeText).optional(),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Authentication required" };

		const controller = ctx.context.controllers.quotes as QuoteController;
		const quote = await controller.createQuote({
			customerId,
			customerEmail: ctx.body.customerEmail,
			customerName: ctx.body.customerName,
			companyName: ctx.body.companyName,
			notes: ctx.body.notes,
		});
		return { quote };
	},
);
