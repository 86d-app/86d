import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";
import type { QuoteController } from "../../service";

export const addCommentEndpoint = createStoreEndpoint(
	"/quotes/:id/comments/add",
	{
		method: "POST",
		body: z.object({
			quoteId: z.string(),
			authorName: z.string().min(1).max(200).transform(sanitizeText),
			message: z.string().min(1).max(2000).transform(sanitizeText),
		}),
	},
	async (ctx) => {
		const customerId = ctx.context.session?.user.id;
		if (!customerId) return { error: "Authentication required" };

		const controller = ctx.context.controllers.quotes as QuoteController;
		const comment = await controller.addComment({
			quoteId: ctx.body.quoteId,
			authorType: "customer",
			authorId: customerId,
			authorName: ctx.body.authorName,
			message: ctx.body.message,
		});
		return { comment };
	},
);
