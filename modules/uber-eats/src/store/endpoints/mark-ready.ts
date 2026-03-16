import { createStoreEndpoint, z } from "@86d-app/core";
import type { UberEatsController } from "../../service";

export const markReadyEndpoint = createStoreEndpoint(
	"/uber-eats/orders/:id/ready",
	{
		method: "POST",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers[
			"uber-eats"
		] as UberEatsController;
		const order = await controller.markReady(ctx.params.id);
		return { order };
	},
);
