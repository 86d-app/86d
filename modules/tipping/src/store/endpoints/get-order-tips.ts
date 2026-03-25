import { createStoreEndpoint, z } from "@86d-app/core";
import type { TippingController } from "../../service";

export const getOrderTips = createStoreEndpoint(
	"/tipping/tips/order/:orderId",
	{
		method: "GET",
		params: z.object({ orderId: z.string().max(128) }),
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

		const controller = ctx.context.controllers.tipping as TippingController;
		const tips = await controller.listTips({
			orderId: ctx.params.orderId,
		});
		const total = await controller.getTipTotal(ctx.params.orderId);
		return { tips, total };
	},
);
