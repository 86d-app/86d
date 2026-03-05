import { createStoreEndpoint, z } from "@86d-app/core";

export const searchProducts = createStoreEndpoint(
	"/products/search",
	{
		method: "GET",
		query: z.object({
			q: z.string().min(1).max(500),
			limit: z.string().optional(),
		}),
	},
	async (ctx) => {
		const { query } = ctx;
		// Call the controller directly
		const products = await ctx.context.controllers.product.search(ctx);
		return { products, query: query.q };
	},
);
