import { createStoreEndpoint, z } from "@86d-app/core";
import type { DoordashController } from "../../service";

export const getDeliveryEndpoint = createStoreEndpoint(
	"/doordash/deliveries/:id",
	{
		method: "GET",
		params: z.object({ id: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.doordash as DoordashController;
		const delivery = await controller.getDelivery(ctx.params.id);
		return { delivery };
	},
);
