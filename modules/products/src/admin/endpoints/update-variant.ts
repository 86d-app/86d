import {
	createAdminEndpoint,
	inventoryCheckoutCapability,
	sanitizeText,
	z,
} from "@86d-app/core";
import type { Product, ProductVariant } from "../../controllers";

export const updateVariant = createAdminEndpoint(
	"/admin/variants/:id/update",
	{
		method: "PUT",
		params: z.object({
			id: z.string(),
		}),
		body: z.object({
			name: z.string().min(1).max(200).transform(sanitizeText).optional(),
			sku: z.string().max(100).nullable().optional(),
			barcode: z.string().max(100).nullable().optional(),
			price: z.number().positive().optional(),
			compareAtPrice: z.number().positive().nullable().optional(),
			costPrice: z.number().positive().nullable().optional(),
			inventory: z.number().int().min(0).optional(),
			options: z.record(z.string(), z.string()).optional(),
			images: z.array(z.string()).optional(),
			weight: z.number().positive().nullable().optional(),
			weightUnit: z.enum(["kg", "lb", "oz", "g"]).nullable().optional(),
			position: z.number().int().min(0).optional(),
		}),
	},
	async (ctx) => {
		const { body } = ctx;
		const controllers = ctx.context.controllers;

		// Check if variant exists
		const existingVariant = (await controllers.variant.getById(
			ctx,
		)) as ProductVariant | null;
		if (!existingVariant) {
			return {
				error: "Variant not found",
				status: 404,
			};
		}

		const variant = (await controllers.variant.update(
			ctx,
		)) as ProductVariant | null;

		// Sync updated inventory count to the inventory module (best-effort).
		if (body.inventory !== undefined && variant) {
			try {
				// Fetch parent product name for the snapshot (best-effort)
				const parentProduct = (await controllers.product.getById({
					...ctx,
					params: { id: existingVariant.productId },
				})) as Product | null;
				await ctx.context.capabilities.invoke(inventoryCheckoutCapability, {
					operation: "set",
					productId: existingVariant.productId,
					variantId: existingVariant.id,
					quantity: body.inventory,
					...(parentProduct?.name ? { productName: parentProduct.name } : {}),
					variantName: variant.name,
				});
			} catch {
				// Best-effort: inventory sync failure never blocks variant update
			}
		}

		return { variant };
	},
);
