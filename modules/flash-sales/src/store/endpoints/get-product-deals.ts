import { createStoreEndpoint, z } from "@86d-app/core";
import type { FlashSaleController } from "../../service";

export const getProductDeals = createStoreEndpoint(
	"/flash-sales/products",
	{
		method: "POST",
		body: z.object({
			productIds: z.array(z.string().min(1)).min(1).max(100),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.flashSales as FlashSaleController;

		const deals = await controller.getActiveProductDeals(ctx.body.productIds);

		return { deals };
	},
);
