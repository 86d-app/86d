import { createStoreEndpoint } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const getBackorder = createStoreEndpoint(
	"/backorders/:id",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const backorder = await controller.getBackorder(ctx.params.id);
		if (!backorder) {
			return { error: "Backorder not found", backorder: null };
		}
		return { backorder };
	},
);
