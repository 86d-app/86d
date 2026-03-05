import { createAdminEndpoint, z } from "@86d-app/core";
import type { InventoryController } from "../../service";

export const adjustStock = createAdminEndpoint(
	"/admin/inventory/adjust",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			variantId: z.string().optional(),
			locationId: z.string().optional(),
			delta: z.number().int(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.inventory as InventoryController;
		const item = await controller.adjustStock({
			productId: ctx.body.productId,
			variantId: ctx.body.variantId,
			locationId: ctx.body.locationId,
			delta: ctx.body.delta,
		});
		if (!item) {
			return { error: "Inventory item not found", status: 404 };
		}
		return { item };
	},
);
