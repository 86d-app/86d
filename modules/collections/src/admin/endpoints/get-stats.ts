import { createAdminEndpoint } from "@86d-app/core";
import type { CollectionController } from "../../service";

export const getStats = createAdminEndpoint(
	"/admin/collections/stats",
	{
		method: "GET",
	},
	async (ctx) => {
		const controller = ctx.context.controllers
			.collections as CollectionController;

		const stats = await controller.getStats();
		return { stats };
	},
);
