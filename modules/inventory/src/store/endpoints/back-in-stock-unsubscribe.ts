import { createStoreEndpoint, z } from "@86d-app/core";
import type { InventoryController } from "../../service";

export const backInStockUnsubscribe = createStoreEndpoint(
	"/inventory/back-in-stock/unsubscribe",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			variantId: z.string().optional(),
			email: z.string().email(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.inventory as InventoryController;
		const removed = await controller.unsubscribeBackInStock({
			productId: ctx.body.productId,
			variantId: ctx.body.variantId,
			email: ctx.body.email,
		});
		return { removed };
	},
);
