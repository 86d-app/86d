import { createStoreEndpoint, z } from "@86d-app/core";

export const listProducts = createStoreEndpoint(
	"/products",
	{
		method: "GET",
		query: z
			.object({
				page: z.string().optional(),
				limit: z.string().optional(),
				category: z.string().optional(),
				featured: z.string().optional(),
				search: z.string().optional(),
				sort: z.enum(["name", "price", "createdAt", "updatedAt"]).optional(),
				order: z.enum(["asc", "desc"]).optional(),
				minPrice: z.string().optional(),
				maxPrice: z.string().optional(),
				inStock: z.string().optional(),
				tag: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		// Call the controller directly - it handles query parsing internally
		const result = await ctx.context.controllers.product.list(ctx);
		return result;
	},
);
