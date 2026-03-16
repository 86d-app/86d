import { createStoreEndpoint, z } from "@86d-app/core";
import type { DoordashController } from "../../service";

export const checkAvailabilityEndpoint = createStoreEndpoint(
	"/doordash/availability",
	{
		method: "GET",
		query: z.object({
			lat: z.coerce.number(),
			lng: z.coerce.number(),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.doordash as DoordashController;
		const availability = await controller.checkDeliveryAvailability({
			lat: ctx.query.lat,
			lng: ctx.query.lng,
		});
		return availability;
	},
);
