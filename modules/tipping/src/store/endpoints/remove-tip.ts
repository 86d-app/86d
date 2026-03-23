import { createStoreEndpoint, z } from "@86d-app/core";
import type { TippingController } from "../../service";

export const removeTip = createStoreEndpoint(
	"/tipping/tips/:id/delete",
	{
		method: "DELETE",
		params: z.object({ id: z.string() }),
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tipping as TippingController;
		const removed = await controller.removeTip(ctx.params.id);

		if (!removed) {
			return { error: "Tip not found", status: 404 };
		}

		return { success: true };
	},
);
