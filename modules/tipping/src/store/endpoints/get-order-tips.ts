import { createStoreEndpoint, z } from "@86d-app/core";
import type { TippingController } from "../../service";

export const getOrderTips = createStoreEndpoint(
	"/tipping/tips/order/:orderId",
	{
		method: "GET",
		params: z.object({ orderId: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tipping as TippingController;
		const tips = await controller.listTips({
			orderId: ctx.params.orderId,
		});
		const total = await controller.getTipTotal(ctx.params.orderId);
		return { tips, total };
	},
);
