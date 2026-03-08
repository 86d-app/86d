import { createStoreEndpoint, z } from "@86d-app/core";
import type { FaqController } from "../../service";

export const searchFaqs = createStoreEndpoint(
	"/faq/search",
	{
		method: "GET",
		query: z.object({
			q: z.string(),
			categoryId: z.string().optional(),
			limit: z.string().optional(),
		}),
	},
	async (ctx) => {
		const faqController = ctx.context.controllers.faq as FaqController;
		const { q, categoryId, limit } = ctx.query;

		const items = await faqController.search(q, {
			categoryId,
			limit: limit ? Number.parseInt(limit, 10) : 20,
		});

		return { items, query: q };
	},
);
