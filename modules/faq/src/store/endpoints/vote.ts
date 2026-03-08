import { createStoreEndpoint, z } from "@86d-app/core";
import type { FaqController } from "../../service";

export const voteFaq = createStoreEndpoint(
	"/faq/items/:id/vote",
	{
		method: "POST",
		params: z.object({
			id: z.string(),
		}),
		body: z.object({
			helpful: z.boolean(),
		}),
	},
	async (ctx) => {
		const faqController = ctx.context.controllers.faq as FaqController;

		const item = await faqController.vote(ctx.params.id, ctx.body.helpful);

		return {
			helpfulCount: item.helpfulCount,
			notHelpfulCount: item.notHelpfulCount,
		};
	},
);
