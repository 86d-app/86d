import { createStoreEndpoint, z } from "@86d-app/core";
import type { InventoryController } from "../../service";

export const backInStockSubscribe = createStoreEndpoint(
	"/inventory/back-in-stock/subscribe",
	{
		method: "POST",
		body: z.object({
			productId: z.string(),
			variantId: z.string().optional(),
			email: z.string().email(),
			customerId: z.string().optional(),
			productName: z.string().optional(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.inventory as InventoryController;
		const subscription = await controller.subscribeBackInStock({
			productId: ctx.body.productId,
			variantId: ctx.body.variantId,
			email: ctx.body.email,
			customerId: ctx.body.customerId,
			productName: ctx.body.productName,
		});
		return { subscription };
	},
);
