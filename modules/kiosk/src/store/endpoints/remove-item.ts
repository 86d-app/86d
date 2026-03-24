import { createStoreEndpoint, z } from "@86d-app/core";
import type { KioskController } from "../../service";

export const removeItemEndpoint = createStoreEndpoint(
	"/kiosk/sessions/:id/items/:itemId/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string().max(128), itemId: z.string().max(128) }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.kiosk as KioskController;
		const session = await controller.removeItem(
			ctx.params.id,
			ctx.params.itemId,
		);
		return { session };
	},
);
