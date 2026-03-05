import { createStoreEndpoint, z } from "@86d-app/core";
import type { InventoryController } from "../../service";

export const backInStockCheck = createStoreEndpoint(
	"/inventory/back-in-stock/check",
	{
		method: "GET",
		query: z.object({
			productId: z.string(),
			variantId: z.string().optional(),
			email: z.string().email(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.inventory as InventoryController;
		const subscribed = await controller.checkBackInStockSubscription({
			productId: ctx.query.productId,
			variantId: ctx.query.variantId,
			email: ctx.query.email,
		});
		return { subscribed };
	},
);
