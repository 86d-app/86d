import { createStoreEndpoint, z } from "@86d-app/core";
import type { StorePickupController } from "../../service";

export const orderPickup = createStoreEndpoint(
	"/store-pickup/order/:orderId",
	{
		method: "GET",
		params: z.object({
			orderId: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.storePickup as StorePickupController;
		const pickup = await controller.getOrderPickup(ctx.params.orderId);
		if (!pickup) {
			return { error: "No active pickup found for this order", status: 404 };
		}
		return { pickup };
	},
);
