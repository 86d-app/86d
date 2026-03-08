import { createAdminEndpoint, z } from "@86d-app/core";
import type { AffiliateController } from "../../service";

export const statsEndpoint = createAdminEndpoint(
	"/admin/affiliates/stats",
	{
		method: "GET",
		query: z.object({}),
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.affiliates as AffiliateController;
		const stats = await controller.getStats();
		return { stats };
	},
);
