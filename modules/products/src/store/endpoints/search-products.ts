import { createStoreEndpoint, sanitizeText, z } from "@86d-app/core";

export const searchProducts = createStoreEndpoint(
	"/products/search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(1).max(500).transform(sanitizeText),
			limit: z.string().optional(),
		}),
	},
	async (ctx) => {
		const products = await ctx.context.controllers.product.search(ctx);
		return { products };
	},
);
