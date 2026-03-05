import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";
import type { Product } from "../../controllers";

export const updateProduct = createAdminEndpoint(
	"/admin/products/:id",
	{
		method: "PUT",
		params: z.object({
			id: z.string(),
		}),
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText).optional(),
			slug: z.string().min(1).max(200).optional(),
			description: z.string().max(10000).transform(sanitizeText).optional(),
			shortDescription: z.string().max(500).transform(sanitizeText).optional(),
			price: z.number().positive().optional(),
			compareAtPrice: z.number().positive().nullable().optional(),
			costPrice: z.number().positive().nullable().optional(),
			sku: z.string().max(100).nullable().optional(),
			barcode: z.string().max(100).nullable().optional(),
			inventory: z.number().int().min(0).optional(),
			trackInventory: z.boolean().optional(),
			allowBackorder: z.boolean().optional(),
			status: z.enum(["draft", "active", "archived"]).optional(),
			categoryId: z.string().nullable().optional(),
			images: z.array(z.string()).optional(),
			tags: z.array(z.string()).optional(),
			metadata: z.record(z.string(), z.any()).optional(),
			weight: z.number().positive().nullable().optional(),
			weightUnit: z.enum(["kg", "lb", "oz", "g"]).nullable().optional(),
			isFeatured: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const { body } = ctx;
		const controllers = ctx.context.controllers;

		// Check if product exists
		const existingProduct = (await controllers.product.getById(
			ctx,
		)) as Product | null;
		if (!existingProduct) {
			return {
				error: "Product not found",
				status: 404,
			};
		}

		// If slug is being changed, check uniqueness
		if (body.slug && body.slug !== existingProduct.slug) {
			const productWithSlug = await controllers.product.getBySlug({
				...ctx,
				query: { slug: body.slug },
			});
			if (productWithSlug) {
				return {
					error: "A product with this slug already exists",
					status: 400,
				};
			}
		}

		const product = await controllers.product.update(ctx);

		return { product };
	},
);
