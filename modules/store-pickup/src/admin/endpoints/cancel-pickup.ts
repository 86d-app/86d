import { createAdminEndpoint, z } from "@86d-app/core";
import type { StorePickupController } from "../../service";

export const cancelPickup = createAdminEndpoint(
	"/admin/store-pickup/pickups/:id/cancel",
	{
		method: "POST",
		params: z.object({
			id: z.string().min(1),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.storePickup as StorePickupController;
		try {
			const pickup = await controller.cancelPickup(ctx.params.id);
			if (!pickup) {
				return { error: "Pickup not found", status: 404 };
			}
			return { pickup };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Cancel failed";
			return { error: message, status: 400 };
		}
	},
);
