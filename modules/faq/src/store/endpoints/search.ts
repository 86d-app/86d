import { createStoreEndpoint, z } from "@86d-app/core";
import type { FaqController } from "../../service";

export const searchFaqs = createStoreEndpoint(
	"/faq/search",
	{
		method: "GET",
		query: z.object({
			q: z.string().max(500),
			categoryId: z.string().max(200).optional(),
			limit: z.string().max(5).optional(),
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
