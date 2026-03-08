import { createAdminEndpoint } from "@86d-app/core";
import type { BackordersController } from "../../service";

export const backorderSummary = createAdminEndpoint(
	"/admin/backorders/summary",
	{ method: "GET" },
	async (ctx) => {
		const controller = ctx.context.controllers
			.backorders as BackordersController;
		const summary = await controller.getSummary();
		return { summary };
	},
);
