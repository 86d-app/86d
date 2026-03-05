import { createStoreEndpoint, z } from "@86d-app/core";

export const getFeaturedProducts = createStoreEndpoint(
	"/products/featured",
	{
		method: "GET",
		query: z
			.object({
				limit: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		// Call the controller directly
		const products = await ctx.context.controllers.product.getFeatured(ctx);
		return { products };
	},
);
