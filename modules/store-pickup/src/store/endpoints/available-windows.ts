import { createStoreEndpoint, z } from "@86d-app/core";
import type { StorePickupController } from "../../service";

export const availableWindows = createStoreEndpoint(
	"/store-pickup/locations/:locationId/windows",
	{
		method: "GET",
		params: z.object({
			locationId: z.string().min(1).max(100),
		}),
		query: z.object({
			date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.storePickup as StorePickupController;
		const windows = await controller.getAvailableWindows({
			locationId: ctx.params.locationId,
			date: ctx.query.date,
		});
		return { windows };
	},
);
