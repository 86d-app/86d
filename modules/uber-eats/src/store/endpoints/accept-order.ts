import { createStoreEndpoint, z } from "@86d-app/core";
import type { UberEatsController } from "../../service";

export const acceptOrderEndpoint = createStoreEndpoint(
	"/uber-eats/orders/:id/accept",
	{
		method: "POST",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const order = await controller.acceptOrder(ctx.params.id);
		return { order };
	},
);
