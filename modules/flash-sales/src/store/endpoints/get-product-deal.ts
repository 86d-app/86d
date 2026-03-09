import { createStoreEndpoint, z } from "@86d-app/core";
import type { FlashSaleController } from "../../service";

export const getProductDeal = createStoreEndpoint(
	"/flash-sales/product/:productId",
	{
		method: "GET",
		params: z.object({
			productId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.flashSales as FlashSaleController;

		const deal = await controller.getActiveProductDeal(ctx.params.productId);

		return { deal };
	},
);
