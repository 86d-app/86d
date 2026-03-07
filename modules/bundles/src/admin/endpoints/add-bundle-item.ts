import { createAdminEndpoint, z } from "@86d-app/core";
import type { BundleController } from "../../service";

export const addBundleItem = createAdminEndpoint(
	"/admin/bundles/:id/items/add",
	{
		method: "POST",
		params: z.object({
			id: z.string().min(1),
		}),
		body: z.object({
			productId: z.string().min(1).max(200),
			variantId: z.string().max(200).optional(),
			quantity: z.number().int().min(1).max(999),
			sortOrder: z.number().int().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.bundles as BundleController;

		// Verify bundle exists
		const bundle = await controller.get(ctx.params.id);
		if (!bundle) {
			return { error: "Bundle not found", status: 404 };
		}

		const item = await controller.addItem({
			bundleId: ctx.params.id,
			productId: ctx.body.productId,
			variantId: ctx.body.variantId,
			quantity: ctx.body.quantity,
			sortOrder: ctx.body.sortOrder,
		});

		return { item };
	},
);
