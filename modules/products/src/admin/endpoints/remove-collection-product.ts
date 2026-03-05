import { createAdminEndpoint, z } from "@86d-app/core";

export const removeCollectionProduct = createAdminEndpoint(
	"/admin/collections/:id/products/:productId",
	{
		method: "DELETE",
		params: z.object({
			id: z.string(),
			productId: z.string(),
		}),
	},
	async (ctx) => {
		return ctx.context.controllers.collection.removeProduct(ctx);
	},
);
