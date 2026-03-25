import { createStoreEndpoint, z } from "@86d-app/core";
import type { GiftWrappingController } from "../../service";

export const orderWrapping = createStoreEndpoint(
	"/gift-wrapping/order/:orderId",
	{
		method: "GET",
		params: z.object({
			orderId: z.string().min(1).max(100),
		}),
	},
	async (ctx) => {
		const userId = ctx.context.session?.user?.id;
		if (!userId) {
			return { error: "Unauthorized", status: 401 };
		}

		const orderCtrl = ctx.context.controllers.order as
			| { getById(id: string): Promise<{ customerId?: string } | null> }
			| undefined;
		if (orderCtrl) {
			const order = await orderCtrl.getById(ctx.params.orderId);
			if (!order || order.customerId !== userId) {
				return { error: "Order not found", status: 404 };
			}
		}

		const controller = ctx.context.controllers
			.giftWrapping as GiftWrappingController;
		const result = await controller.getOrderWrappingTotal(ctx.params.orderId);
		return result;
	},
);
