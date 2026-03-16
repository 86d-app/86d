import { createStoreEndpoint, z } from "@86d-app/core";
import type { KioskController } from "../../service";

export const updateItemEndpoint = createStoreEndpoint(
	"/kiosk/sessions/:id/items/:itemId",
	{
		method: "PUT",
		params: z.object({ id: z.string(), itemId: z.string() }),
		body: z.object({
			quantity: z.number().int().min(0),
		}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.kiosk as KioskController;
		const session = await controller.updateItemQuantity(
			ctx.params.id,
			ctx.params.itemId,
			ctx.body.quantity,
		);
		return { session };
	},
);
