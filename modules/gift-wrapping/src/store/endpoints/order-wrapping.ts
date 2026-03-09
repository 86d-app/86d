import { createStoreEndpoint, z } from "@86d-app/core";
import type { GiftWrappingController } from "../../service";

export const orderWrapping = createStoreEndpoint(
	"/gift-wrapping/order/:orderId",
	{
		method: "GET",
		params: z.object({
			orderId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.giftWrapping as GiftWrappingController;
		const result = await controller.getOrderWrappingTotal(ctx.params.orderId);
		return result;
	},
);
