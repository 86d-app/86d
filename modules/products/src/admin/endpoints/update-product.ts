import {
	createAdminEndpoint,
	inventoryCheckoutCapability,
	sanitizeText,
	z,
} from "@86d-app/core";
import type { Product } from "../../controllers";

export const updateProduct = createAdminEndpoint(
	"/admin/products/:id/update",
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
			metadata: z
				.record(z.string().max(100), z.unknown())
				.refine((r) => Object.keys(r).length <= 50, "Too many metadata keys")
				.optional(),
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

		const product = (await controllers.product.update(ctx)) as Product | null;

		// Sync updated inventory count to the inventory module (best-effort).
		if (body.inventory !== undefined && product) {
			try {
				await ctx.context.capabilities.invoke(inventoryCheckoutCapability, {
					operation: "set",
					productId: existingProduct.id,
					quantity: body.inventory,
					...(product?.name ? { productName: product.name } : {}),
					allowBackorder: body.allowBackorder ?? existingProduct.allowBackorder,
				});
			} catch {
				// Best-effort: inventory sync failure never blocks product update
			}
		}

		if (product) {
			void ctx.context.events?.emit("product.updated", {
				productId: product.id,
				name: product.name,
				slug: product.slug,
				price: product.price,
				status: product.status,
			});
		}
		return { product };
	},
);
