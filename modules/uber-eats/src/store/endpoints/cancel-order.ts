import { createStoreEndpoint, z } from "@86d-app/core";
import type { UberEatsController } from "../../service";

export const cancelOrderEndpoint = createStoreEndpoint(
	"/uber-eats/orders/:id/cancel",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const order = await controller.cancelOrder(ctx.params.id);
		return { order };
	},
);
