import { createAdminEndpoint, z } from "@86d-app/core";

export const addCollectionProduct = createAdminEndpoint(
	"/admin/collections/:id/products",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
		body: z.object({
			productId: z.string().min(1),
			position: z.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const link = await ctx.context.controllers.collection.addProduct(ctx);
		return { link, status: 201 };
	},
);
