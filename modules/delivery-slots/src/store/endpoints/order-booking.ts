import { createStoreEndpoint } from "@86d-app/core";
import type { DeliverySlotsController } from "../../service";

export const orderBooking = createStoreEndpoint(
	"/delivery-slots/order/:orderId",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.deliverySlots as DeliverySlotsController;
		const booking = await controller.getOrderBooking(ctx.params.orderId);
		return { booking };
	},
);
