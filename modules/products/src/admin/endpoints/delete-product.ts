import { createAdminEndpoint, z } from "@86d-app/core";

export const deleteProduct = createAdminEndpoint(
	"/admin/products/:id",
	{
		method: "DELETE",
		params: z.object({
			id: z.string(),
		}),
	},
	async (ctx) => {
		const controllers = ctx.context.controllers;

		// Check if product exists
		const existingProduct = await controllers.product.getById(ctx);
		if (!existingProduct) {
			return {
				error: "Product not found",
				status: 404,
			};
		}

		await controllers.product.delete(ctx);

		return { success: true, message: "Product deleted successfully" };
	},
);
