import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";

export const createVariant = createAdminEndpoint(
	"/admin/products/:productId/variants",
	{
		method: "POST",
		params: z.object({
			productId: z.string(),
		}),
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText),
			sku: z.string().max(100).optional(),
			barcode: z.string().max(100).optional(),
			price: z.number().positive(),
			compareAtPrice: z.number().positive().optional(),
			costPrice: z.number().positive().optional(),
			inventory: z.number().int().min(0).optional(),
			options: z.record(z.string(), z.string()),
			images: z.array(z.string()).optional(),
			weight: z.number().positive().optional(),
			weightUnit: z.enum(["kg", "lb", "oz", "g"]).optional(),
			position: z.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const { params } = ctx;
		const controllers = ctx.context.controllers;

		// Check if product exists
		const existingProduct = await controllers.product.getById({
			...ctx,
			params: { id: params.productId },
		});
		if (!existingProduct) {
			return {
				error: "Product not found",
				status: 404,
			};
		}

		const variant = await controllers.variant.create(ctx);

		return { variant, status: 201 };
	},
);
