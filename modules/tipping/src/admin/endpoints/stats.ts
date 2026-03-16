import { createAdminEndpoint } from "@86d-app/core";
import type { TippingController } from "../../service";

export const getTipStats = createAdminEndpoint(
	"/admin/tipping/stats",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers.tipping as TippingController;
		const stats = await controller.getTipStats();
		return { stats };
	},
);
