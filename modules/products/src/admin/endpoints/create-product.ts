import { createAdminEndpoint, sanitizeText, z } from "@86d-app/core";

export const createProduct = createAdminEndpoint(
	"/admin/products",
	{
		method: "POST",
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText),
			slug: z.string().min(1).max(200),
			description: z.string().max(10000).transform(sanitizeText).optional(),
			shortDescription: z.string().max(500).transform(sanitizeText).optional(),
			price: z.number().positive(),
			compareAtPrice: z.number().positive().optional(),
			costPrice: z.number().positive().optional(),
			sku: z.string().max(100).optional(),
			barcode: z.string().max(100).optional(),
			inventory: z.number().int().min(0).optional(),
			trackInventory: z.boolean().optional(),
			allowBackorder: z.boolean().optional(),
			status: z.enum(["draft", "active", "archived"]).optional(),
			categoryId: z.string().optional(),
			images: z.array(z.string()).optional(),
			tags: z.array(z.string()).optional(),
			metadata: z.record(z.string(), z.any()).optional(),
			weight: z.number().positive().optional(),
			weightUnit: z.enum(["kg", "lb", "oz", "g"]).optional(),
			isFeatured: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const { body } = ctx;
		const controllers = ctx.context.controllers;

		// Check if slug is unique
		const existingProduct = await controllers.product.getBySlug({
			...ctx,
			query: { slug: body.slug },
		});
		if (existingProduct) {
			return {
				error: "A product with this slug already exists",
				status: 400,
			};
		}

		const product = await controllers.product.create(ctx);

		return { product, status: 201 };
	},
);
