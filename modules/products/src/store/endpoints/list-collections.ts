import { createStoreEndpoint, z } from "@86d-app/core";

export const listCollections = createStoreEndpoint(
	"/collections",
	{
		method: "GET",
		query: z
			.object({
				page: z.string().optional(),
				limit: z.string().optional(),
				featured: z.string().optional(),
			})
			.optional(),
	},
	async (ctx) => {
		const result = await ctx.context.controllers.collection.list({
			...ctx,
			query: { ...ctx.query, visible: "true" },
		});
		return result;
	},
);
