import { createAdminEndpoint, z } from "@86d-app/core";
import type { ProductFeedsController } from "../../service";

const productDataSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	price: z.number().min(0),
	compareAtPrice: z.number().optional(),
	currency: z.string().optional(),
	sku: z.string().optional(),
	barcode: z.string().optional(),
	brand: z.string().optional(),
	category: z.string().optional(),
	imageUrl: z.string().optional(),
	additionalImages: z.array(z.string()).optional(),
	url: z.string().optional(),
	availability: z.string().optional(),
	condition: z.string().optional(),
	weight: z.number().optional(),
	weightUnit: z.string().optional(),
	color: z.string().optional(),
	size: z.string().optional(),
	material: z.string().optional(),
	customFields: z
		.record(z.string().max(100), z.string())
		.refine((r) => Object.keys(r).length <= 50, "Too many keys")
		.optional(),
});

export const generateFeed = createAdminEndpoint(
	"/admin/product-feeds/:id/generate",
	{
		method: "POST",
		body: z.object({
			products: z.array(productDataSchema),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.productFeeds as ProductFeedsController;

		const result = await controller.generateFeed(
			ctx.params.id,
			ctx.body.products,
		);

		if (!result) {
			return { error: "Feed not found" };
		}

		return {
			itemCount: result.itemCount,
			errorCount: result.errorCount,
			warningCount: result.warningCount,
		};
	},
);
