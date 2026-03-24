import { createStoreEndpoint, z } from "@86d-app/core";
import type { UberEatsController } from "../../service";

export const getOrderEndpoint = createStoreEndpoint(
	"/uber-eats/orders/:id",
	{
		method: "GET",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const order = await controller.getOrder(ctx.params.id);
		return { order };
	},
);
