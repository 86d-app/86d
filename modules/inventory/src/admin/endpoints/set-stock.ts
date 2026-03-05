import { createAdminEndpoint, z } from "@86d-app/core";
import type { InventoryController } from "../../service";

export const setStock = createAdminEndpoint(
	"/admin/inventory/set",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			variantId: z.string().optional(),
			locationId: z.string().optional(),
			quantity: z.number().int().min(0),
			lowStockThreshold: z.number().int().min(0).optional(),
			allowBackorder: z.boolean().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.inventory as InventoryController;
		const item = await controller.setStock({
			productId: ctx.body.productId,
			variantId: ctx.body.variantId,
			locationId: ctx.body.locationId,
			quantity: ctx.body.quantity,
			lowStockThreshold: ctx.body.lowStockThreshold,
			allowBackorder: ctx.body.allowBackorder,
		});
		return { item };
	},
);
