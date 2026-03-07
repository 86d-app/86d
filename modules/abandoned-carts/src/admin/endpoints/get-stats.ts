import { createAdminEndpoint } from "@86d-app/core";
import type { AbandonedCartController } from "../../service";

export const getStats = createAdminEndpoint(
	"/admin/abandoned-carts/stats",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.abandonedCarts as AbandonedCartController;
		const stats = await controller.getStats();
		return { stats };
	},
);
