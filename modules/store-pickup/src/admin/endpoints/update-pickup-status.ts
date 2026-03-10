import { createAdminEndpoint, z } from "@86d-app/core";
import type { StorePickupController } from "../../service";

export const updatePickupStatus = createAdminEndpoint(
	"/admin/store-pickup/pickups/:id/status",
	{
		method: "POST",
		params: z.object({
			id: z.string().min(1),
		}),
		body: z.object({
			status: z.enum([
				"scheduled",
				"preparing",
				"ready",
				"picked_up",
				"cancelled",
			]),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.storePickup as StorePickupController;
		try {
			const pickup = await controller.updatePickupStatus(
				ctx.params.id,
				ctx.body.status,
			);
			if (!pickup) {
				return { error: "Pickup not found", status: 404 };
			}
			return { pickup };
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Status update failed";
			return { error: message, status: 400 };
		}
	},
);
